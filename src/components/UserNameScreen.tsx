import {useState} from "react";

import {isValidUserName} from "@tame5kosengame/shared";

type UserNameScreenProps = {
  onSubmit: (name: string) => Promise<void>;
};

export function UserNameScreen({onSubmit}: UserNameScreenProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextName = event.target.value.slice(0, 16);
    setName(nextName);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidUserName(name)) {
      setError("16文字以内の半角英数字で入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(name);
    } catch {
      setError("登録に失敗しました。もう一度お試しください");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="screen user-name-screen">
      <form className="user-name-form" onSubmit={handleSubmit}>
        <h1 className="user-name-title">ユーザー名を入力</h1>
        <p className="user-name-note">
          ※16文字以内の半角英大文字・小文字・
          <br />
          アラビア数字でのみ入力可能
        </p>
        <input
          aria-label="ユーザー名"
          className="user-name-input"
          disabled={isSubmitting}
          maxLength={16}
          onChange={handleChange}
          type="text"
          value={name}
        />
        {error && <p className="user-name-error">{error}</p>}
        <button className="user-name-submit" disabled={isSubmitting} type="submit">
          決定
        </button>
      </form>
    </main>
  );
}
