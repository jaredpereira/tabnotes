export function generateMetadata({ params }: { params: { note: string } }) {
  return {
    title: decodeURIComponent(params.note),
    description: "A page for taking notes",
    robots: "noindex",
  };
}

export default function Layout(props: { children: React.ReactNode }) {
  return <>{props.children}</>;
}
