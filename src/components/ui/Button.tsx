import "./Button.css";

export const BUTTON_COLOR_TYPE = {
  PRIMARY: "primary",
  PAGE: "page",
  IMAGE: "image",
} as const;

type ButtonColorVariant = (typeof BUTTON_COLOR_TYPE)[keyof typeof BUTTON_COLOR_TYPE];

export const BUTTON_SHAPE_TYPE = {
  LANDSCAPE: "landscape",
  SQUARE: "square",
} as const;

type ButtonShapeVariant = (typeof BUTTON_SHAPE_TYPE)[keyof typeof BUTTON_SHAPE_TYPE];

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  colorVariant?: ButtonColorVariant;
  shapeVariant?: ButtonShapeVariant;
};

export function Button({
  colorVariant = BUTTON_COLOR_TYPE.PRIMARY,
  shapeVariant = BUTTON_SHAPE_TYPE.LANDSCAPE,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button-${colorVariant} button-${shapeVariant} ${className}`}
      {...props}
    />
  );
}
