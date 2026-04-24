type StatusCardProps = {
  title: string;
  detail: string;
};

export function StatusCard({ title, detail }: StatusCardProps) {
  return <section><h3>{title}</h3><p>{detail}</p></section>;
}