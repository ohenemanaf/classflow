import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Button, Group, TextRow } from './ui.jsx';

export default function Onboarding({ onSubmit }) {
  const [form, setForm] = useState({ name: '', program: '' });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name: form.name.trim(), program: form.program.trim() });
      }}
      className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="glass lift mx-auto grid size-22 place-items-center overflow-hidden rounded-[1.5rem] text-tint">
        <BookOpen size={46} strokeWidth={1.5} className="book-mark" />
      </div>
      <h1 className="mt-6 text-center text-[2.125rem] leading-tight font-bold tracking-[-0.03em]">Welcome to ClassFlow</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-[1.0625rem] text-secondary">
        Your next class, where it is, and how long until it starts.
      </p>

      <Group className="mt-9" footer="Saved only on this device. No account needed.">
        <TextRow label="Your name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextRow
          label="Course / program"
          required
          value={form.program}
          onChange={(e) => setForm({ ...form, program: e.target.value })}
        />
      </Group>

      <Button type="submit" className="mt-auto w-full">
        Continue
      </Button>
    </form>
  );
}
