import { startTransition, type FormEvent } from "react";

// React 19 resets a <form action> after every submit, even a failed one, wiping what
// people typed. Submitting through onSubmit keeps their input when we show an error.
// Keep `action={dispatch}` on the form too, so a submit before hydration still posts to the
// server action instead of falling back to a GET that would put the fields in the URL.
export const keepValuesOnSubmit = (dispatch: (fd: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => dispatch(fd));
};
