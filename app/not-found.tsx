import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="naoachou">
      <p className="lcd grande">404</p>
      <h1>Esse andar ainda não existe.</h1>
      <p>Ninguém mora com esse @ por enquanto.</p>
      <Link className="primario" href="/">Pegar meu apartamento</Link>
    </main>
  );
}
