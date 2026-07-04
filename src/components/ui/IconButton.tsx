import "./IconButton.css";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  iconSrc: string;
  label: string;
};

export function IconButton({
  className = "",
  iconSrc,
  label,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button aria-label={label} className={`icon-button ${className}`} type={type} {...props}>
      <img className="icon-button-image" src={iconSrc} alt="" />
    </button>
  );
}
