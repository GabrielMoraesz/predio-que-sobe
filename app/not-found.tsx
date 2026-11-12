import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="naoachou">
      <p className="lcd grande">404</p>
      <h1>Esse andar ainda não existe.</h1>
      <p>Ninguém mora com esse @ por enquanto. Quem segue o @paulimsortudo ganha janela no censo das 12h.</p>
      <Link className="primario" href="/">Ver o prédio</Link>
    </main>
  );
}
