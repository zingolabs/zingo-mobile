export type ColorsType = {
  background: string;
  card: string;
  border: string;
  primary: string;
  primaryDisabled: string;
  secondaryDisabled: string;
  secondary?: string;
  secondaryBorder?: string;
  tertiary?: string;
  text: string;
  muted: string;
  placeholder: string;
  active: string;
  notification: string;
  sideMenuBackground: string;
  modal?: string;
  warning: {
    background: string;
    border: string;
    primary: string;
    primaryDark?: string;
    title: string;
    text: string;
  };
  danger: {
    background: string;
    border: string;
    primary?: string;
    text: string;
  };
};
