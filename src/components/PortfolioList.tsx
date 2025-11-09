import { PortfolioWithValues } from '@/types/api';
import PortfolioCard from './PortfolioCard';

interface PortfolioListProps {
  portfolios: PortfolioWithValues[];
  onDelete: (id: string) => void;
}

export default function PortfolioList({ portfolios, onDelete }: PortfolioListProps) {
  if (portfolios.length === 0) {
    return (
      <div className="empty-state">
        <p>No portfolios yet. Create your first portfolio to get started!</p>
      </div>
    );
  }

  return (
    <div className="portfolio-grid">
      {portfolios.map((portfolio) => (
        <PortfolioCard
          key={portfolio.id}
          portfolio={portfolio}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
