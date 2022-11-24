export class ErrorModalData {
  title: string;
  body: string;

  modalIsOpen: boolean;

  constructor() {
    this.modalIsOpen = false;
    this.title = '';
    this.body = '';
  }
}
