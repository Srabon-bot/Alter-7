export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const kind = variant === 'secondary' ? 'btn-secondary' : variant === 'blood' ? 'btn-blood' : 'btn-primary';
  return (
    <button type="button" className={`btn ${kind} ${className}`} {...props}>
      {children}
    </button>
  );
}
