import { useId, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <span className="password-input">
      <input
        {...props}
        id={props.id ?? id}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={props.id ?? id}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={19} aria-hidden />
        ) : (
          <Eye size={19} aria-hidden />
        )}
      </button>
    </span>
  );
}
