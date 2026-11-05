import { Alert } from './Sheet.jsx';

export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <Alert
      title={title}
      message={message}
      onClose={onCancel}
      actions={[
        { label: 'Cancel', onClick: onCancel },
        { label: confirmLabel, onClick: onConfirm, destructive: true },
      ]}
    />
  );
}
