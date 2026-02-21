import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { RoundWithStatus } from '../types/api';
import './HomePage.css';

const STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  cooldown: 'Cooldown',
  finished: 'Завершён',
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('ru-RU');
};

export const HomePage: React.FC = () => {
  const [rounds, setRounds] = useState<RoundWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingRound, setCreatingRound] = useState(false);
  const navigate = useNavigate();

  const username = apiService.getUsername();
  const isAdmin = apiService.isAdmin();

  const fetchRounds = useCallback(async (isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      const data = await apiService.getRounds();
      setRounds(data);
      setError('');
    } catch {
      setError('Ошибка загрузки раундов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRounds(true);
    const interval = setInterval(() => fetchRounds(false), 5000);
    return () => clearInterval(interval);
  }, [fetchRounds]);

  const handleLogout = () => {
    apiService.removeToken();
    navigate('/auth');
  };

  const handleCreateRound = async () => {
    try {
      setCreatingRound(true);
      setError('');
      const response = await apiService.createRound();
      // After creation, navigate to the round page
      navigate(`/round/${response.round.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания раунда');
      setCreatingRound(false);
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="page-container">
          <div className="empty-state">Загрузка раундов...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="page-container">
        <header className="page-header">
          <h1>Список РАУНДОВ</h1>
          <div className="actions">
            {isAdmin && (
              <button
                onClick={handleCreateRound}
                disabled={creatingRound}
                className="btn-success"
              >
                {creatingRound ? 'Создание...' : 'Создать раунд'}
              </button>
            )}
            <span className="username-badge">{username}</span>
            <button onClick={handleLogout} className="btn-danger">
              Выйти
            </button>
          </div>
        </header>

        {error && <div className="error-text">{error}</div>}

        {rounds.length === 0 ? (
          <div className="empty-state">Нет активных или запланированных раундов</div>
        ) : (
          <div className="rounds-list">
            {rounds.map((round) => (
              <Link
                key={round.uuid}
                to={`/round/${round.uuid}`}
                className="round-card"
              >
                <div className="round-card-id">
                  ● Round ID: {round.uuid}
                </div>
                <div className="round-card-dates">
                  Start: {formatDate(round.start_datetime)}
                  <br />
                  End: {formatDate(round.end_datetime)}
                </div>
                <hr className="round-card-divider" />
                <div className={`round-card-status status-${round.status}`}>
                  Статус: {STATUS_LABELS[round.status] ?? round.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
