import { useId, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import Sheet from './Sheet.jsx';
import { Button, Group, TextRow } from './ui.jsx';

// Web3Forms access keys are meant to ship in client code.
const WEB3FORMS_KEY = '7a5229ef-22f3-428c-be7e-cbf7c5ca7193';

export default function FeedbackSheet({ profile, onToast, onClose }) {
  const formId = useId();
  const [form, setForm] = useState({ name: profile.name, email: '', message: '' });
  const [status, setStatus] = useState('idle');
  const bind = (key) => ({
    value: form[key],
    onChange: (event) => setForm({ ...form, [key]: event.target.value }),
  });

  const submit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    try {
      const body = new FormData();
      body.append('access_key', WEB3FORMS_KEY);
      body.append('name', form.name);
      body.append('email', form.email);
      body.append('message', form.message);
      const response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body });
      const result = await response.json();
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('idle');
        onToast('Sending failed', result.message || "Couldn't send that. Try again.");
      }
    } catch {
      setStatus('idle');
      onToast('Network error', 'Sending feedback needs an internet connection.');
    }
  };

  if (status === 'success') {
    return (
      <Sheet title="Feedback" onClose={onClose} cancelLabel="Done">
        <div className="py-8 text-center">
          <CircleCheck size={52} strokeWidth={1.5} className="mx-auto text-live" />
          <h3 className="mt-3 text-[1.375rem] font-bold tracking-[-0.02em]">Thank you!</h3>
          <p className="mt-1 text-[0.9375rem] text-secondary">Your message was sent.</p>
          <Button variant="plain" onClick={onClose} className="mx-auto mt-6">
            Close
          </Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Feedback"
      onClose={onClose}
      action={{ label: status === 'submitting' ? 'Sending…' : 'Send', form: formId, disabled: status === 'submitting' }}
      persistent
    >
      <form id={formId} onSubmit={submit} className="space-y-5">
        <Group footer="We reply by email.">
          <TextRow label="Your name" required {...bind('name')} />
          <TextRow label="Email" type="email" required autoComplete="email" {...bind('email')} />
        </Group>
        <Group>
          <TextRow as="textarea" label="Your suggestion or bug report" required rows={5} className="resize-none" {...bind('message')} />
        </Group>
      </form>
    </Sheet>
  );
}
