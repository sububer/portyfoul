import Link from 'next/link';

export default function Home() {
  return (
    <main className="container">
      <h1>Portyfoul</h1>
      <p>Stock and Crypto Portfolio Manager</p>
      <div className="card">
        <h2>Welcome</h2>
        <p>Manage your investment portfolios with ease. Track stocks and cryptocurrencies in one place.</p>

        <h3>Features</h3>
        <ul>
          <li>Create and manage multiple portfolios</li>
          <li>Track stocks and cryptocurrencies</li>
          <li>Monitor portfolio values in real-time</li>
          <li>View detailed asset breakdowns</li>
        </ul>

        <div className="nav-links">
          <Link href="/portfolios">View My Portfolios</Link>
        </div>
      </div>
    </main>
  )
}
