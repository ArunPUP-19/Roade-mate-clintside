import ActionCard from '../components/ActionCard';
import { Car, Search, Navigation } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="container home-container">
      <header className="hero-section text-center animate-fade-in">
        <h1 className="text-4xl font-bold mb-4">
          Share the Journey, <span className="text-gradient">Split the Cost</span>
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          Connect with people heading the same way. Whether you have an empty seat or need a ride,
          RouteMate makes traveling together easy and economical.
        </p>
      </header>

      <section className="options-grid">
        <div className="delay-1">
          <ActionCard 
            title="I'm Going"
            description="Have empty seats? Offer them to people going your way and share travel expenses."
            icon={Car}
            to="/im-going"
            primary={true}
          />
        </div>
        <div className="delay-2">
          <ActionCard 
            title="Find a Trip"
            description="Need a ride? Search for existing trips that match your route, date, and time."
            icon={Search}
            to="/find-trip"
          />
        </div>
        <div className="delay-3">
          <ActionCard 
            title="I Want to Go"
            description="Can't find a trip? Publish your travel needs so people already going that way can offer a seat."
            icon={Navigation}
            to="/i-want-to-go"
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
