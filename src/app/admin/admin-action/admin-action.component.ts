import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IActionResponse } from 'src/app/shared/interfaces/action/action';
import { ActionService } from 'src/app/shared/services/action/action.service';
import { deleteObject, getDownloadURL, percentage, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
@Component({
  selector: 'app-admin-action',
  templateUrl: './admin-action.component.html',
  styleUrls: ['./admin-action.component.scss']
})
export class AdminActionComponent implements OnInit {
  adminActions!: IActionResponse[];
  formAddAction!: FormGroup;
  addTemplateStatus = false;
  editStatus = false;
  editID!: number;
  uploadPercent!: number;
  isUploaded = false;

  constructor(private actionsService: ActionService, private fb: FormBuilder, private fireStorage: Storage) {
    this.createForm();
  }

  ngOnInit(): void {
    this.getAllActions();
  }

  createForm() {
    this.formAddAction = this.fb.group({
      name: ['', Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      imagePath: [null, Validators.required]
    });
  }

  resetForm(): void {
    this.editStatus = false;
    this.isUploaded = false;
    this.uploadPercent = 0;
    this.formAddAction.reset();
  }

  toggleAddTemplate(): void {
    this.resetForm();
    this.addTemplateStatus ? this.addTemplateStatus = false : this.addTemplateStatus = true;
  }

  getAllActions(): void { this.actionsService.getAll().subscribe(data => { this.adminActions = data }) }

  addActions(): void {
    const newAction = this.formAddAction.value;
    newAction.date = new Date();
    this.actionsService.create(newAction).subscribe(() => { this.getAllActions() });
    this.toggleAddTemplate();
  }

  editActions(action: IActionResponse): void {
    this.formAddAction.setValue({
      name: action.name,
      title: action.title,
      description: action.description,
      imagePath: action.imagePath
    });
    this.editID = action.id;
    this.editStatus = true;
    this.isUploaded = true;
    this.addTemplateStatus = true;
  }

  updateActions(): void {
    const newAction = this.formAddAction.value;
    this.actionsService.update(this.editID, newAction).subscribe(() => { this.getAllActions() });
    this.toggleAddTemplate();
  }

  deleteActions(action: IActionResponse): void {
    this.actionsService.delete(action.id).subscribe(() => {
      this.deleteImage(action.imagePath);
      this.getAllActions();
    });
  }

  upload(event: any): void {
    const file = event.target.files[0];
    this.uploadFile('images/actions', file.name, file)
      .then(data => {
        this.formAddAction.patchValue({ imagePath: data })
        this.isUploaded = true;
      })
      .catch(error => { console.log(error) });
  }

  async uploadFile(folder: string, name: string, file: File | null): Promise<string> {
    const path = `${folder}/${name}`;
    let url = '';
    if (file) {
      try {
        const storageRef = ref(this.fireStorage, path);
        const task = uploadBytesResumable(storageRef, file);
        percentage(task).subscribe(data => { this.uploadPercent = data.progress });
        await task;
        url = await getDownloadURL(storageRef);
      } catch (error: any) { console.error(error) }
    } else { console.log('Wrong format') }
    return Promise.resolve(url);
  }

  deleteImage(imageUrl: string): void {
    const task = ref(this.fireStorage, imageUrl);
    deleteObject(task).then(() => {
      console.log('File deleted');
      this.isUploaded = false;
      this.uploadPercent = 0;
      this.formAddAction.patchValue({ imagePath: null })
    }).catch(error => {
      console.log(error)
      this.isUploaded = false;
      this.formAddAction.patchValue({ imagePath: null })
    })
  }
}
