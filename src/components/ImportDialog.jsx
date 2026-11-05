import { Alert } from './Sheet.jsx';

export default function ImportDialog({ incoming, willReplace, onImport, onCancel }) {
  const count = incoming.timetable.length;
  return (
    <Alert
      title="Import Schedule?"
      message={`${incoming.name} shared ${count} ${count === 1 ? 'class' : 'classes'}.${
        willReplace ? ' This replaces your current timetable. Deadlines stay.' : ''
      }`}
      onClose={onCancel}
      actions={[
        { label: 'Cancel', onClick: onCancel },
        { label: 'Import', onClick: onImport, primary: true },
      ]}
    />
  );
}
