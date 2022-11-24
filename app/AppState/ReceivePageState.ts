export class ReceivePageState {
  // A newly created address to show by default
  newAddress: string;

  // The key used for the receive page component.
  // Increment to force re-render
  rerenderKey: number;

  constructor() {
    this.newAddress = '';
    this.rerenderKey = 0;
  }
}
