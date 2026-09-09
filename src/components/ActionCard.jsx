import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './ActionCard.css';

const ActionCard = ({ title, description, icon: Icon, to, primary }) => {
  return (
    <Link to={to} className={`action-card glass-panel animate-fade-in ${primary ? 'primary-card' : ''}`}>
      <div className="card-icon-wrapper">
        <Icon className="card-icon" size={32} />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted">{description}</p>
      <div className="card-footer">
        <span className="font-semibold">Get Started</span>
        <ArrowRight size={18} className="arrow-icon" />
      </div>
    </Link>
  );
};

export default ActionCard;
