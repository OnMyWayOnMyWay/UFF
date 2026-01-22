import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowRightLeft, ArrowRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import TeamLogo from '../components/TeamLogo';

import API from '../lib/api';

const Trades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await axios.get(`${API}/trades`);
        setTrades(response.data);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="trades-page" className="min-h-screen">
      {/* Header */}
      <div className="relative hero-bg px-6 md:px-12 pt-12 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2 animate-slide-up">
            <ArrowRightLeft className="w-6 h-6 text-neon-volt" />
            <span className="font-body text-xs uppercase tracking-widest text-white/50">Transaction History</span>
          </div>
          <h1 className="font-heading font-black text-4xl md:text-6xl tracking-tighter uppercase text-white animate-slide-up stagger-1">
            RECENT <span className="text-neon-volt">TRADES</span>
          </h1>
          <p className="font-body text-white/60 mt-2 max-w-md animate-slide-up stagger-2">
            All completed trades and player movements.
          </p>
        </div>
      </div>

      {/* Trades List */}
      <div className="px-6 md:px-12 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {trades.map((trade, idx) => (
            <Card 
              key={trade.id} 
              className="glass-panel border-white/10 overflow-hidden animate-slide-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
              data-testid={`trade-card-${idx}`}
            >
              <CardContent className="p-0">
                {/* Trade Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="w-5 h-5 text-neon-volt" />
                    <span className="font-heading font-bold text-lg text-white">Trade Completed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm text-white/40">{trade.date}</span>
                    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                      {trade.status}
                    </Badge>
                  </div>
                </div>

                {/* Trade Details */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 p-6">
                  {/* Team 1 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <TeamLogo 
                        team={{ name: trade.team1_name, color: trade.team1_color, abbreviation: trade.team1_abbr, logo: trade.team1_logo }} 
                        size="lg" 
                      />
                      <div>
                        <div className="font-heading font-bold text-white">{trade.team1_name}</div>
                        <div className="font-body text-xs text-white/40 uppercase">Receives</div>
                      </div>
                    </div>
                    <div className="space-y-2 pl-15">
                      {trade.team1_receives.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-body text-white">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-white/40 rotate-0 md:rotate-0" />
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <TeamLogo 
                        team={{ name: trade.team2_name, color: trade.team2_color, abbreviation: trade.team2_abbr, logo: trade.team2_logo }} 
                        size="lg" 
                      />
                      <div>
                        <div className="font-heading font-bold text-white">{trade.team2_name}</div>
                        <div className="font-body text-xs text-white/40 uppercase">Receives</div>
                      </div>
                    </div>
                    <div className="space-y-2 pl-15">
                      {trade.team2_receives.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="font-body text-white">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Trades;
