import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Round } from '../types/api';

export const HomePage: React.FC = () => {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingRound, setCreatingRound] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let initialFetch = true;
    const fetchRounds = async () => {
      try {
        setRounds((prev) => {
          initialFetch = prev.length === 0;
          return prev;
        });
        setLoading(initialFetch);
        const roundsData = await apiService.getRounds();
        setRounds(roundsData);
      } catch (err) {
        setError('Ошибка загрузки раундов');
        // Если ошибка авторизации, перенаправляем на страницу входа
        if (err instanceof Error && err.message.includes('Authentication')) {
          apiService.removeToken();
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();

    // Устанавливаем интервал для обновления каждые 3 секунды
    const interval = setInterval(fetchRounds, 3000);

    // Очищаем интервал при размонтировании компонента
    return () => clearInterval(interval);
  }, [navigate]);

  const currentUser = apiService.decodeToken();

  const handleLogout = () => {
    apiService.removeToken();
    navigate('/auth');
  };

  const handleCreateRound = async () => {
    try {
      setCreatingRound(true);
      setError('');
      const newRound = await apiService.createRound();
      navigate(`/round/${newRound.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания раунда');
    } finally {
      setCreatingRound(false);
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#28a745';
      case 'completed':
      case 'finished':
        return '#6c757d';
      case 'pending':
      case 'scheduled':
      case 'cooldown':
        return '#ffc107';
      default:
        return '#007bff';
    }
  };

  const handleRoundClick = (uuid: string) => {
    navigate(`/round/${uuid}`);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Загрузка раундов...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{ margin: 0, color: '#333' }}>
            The Last of Guss
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentUser && (
              <span style={{ color: '#495057', fontSize: '0.95rem' }}>
                Игрок: <strong>{currentUser.username}</strong> {currentUser.role === 'admin' ? '(Admin)' : ''}
              </span>
            )}
            {apiService.isAdmin() && (
              <button
                onClick={handleCreateRound}
                disabled={creatingRound}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: creatingRound ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: creatingRound ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {creatingRound ? 'Создание...' : 'Создать раунд'}
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Выйти
            </button>
          </div>
        </header>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.5rem 2rem',
            borderBottom: '1px solid #eee'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              Список раундов
            </h2>
          </div>

          {error && (
            <div style={{
              padding: '1rem 2rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderBottom: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {rounds.length === 0 ? (
            <div style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              color: '#666'
            }}>
              Раунды не найдены
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      ID
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Статус
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Начало
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: '600',
                      color: '#495057'
                    }}>
                      Конец
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => (
                    <tr 
                      key={round.uuid} 
                      onClick={() => handleRoundClick(round.uuid)}
                      style={{
                        borderBottom: '1px solid #dee2e6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{
                        padding: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        color: '#666'
                      }}>
                        {round.uuid.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: '500',
                          backgroundColor: getStatusColor(round.status),
                          color: 'white'
                        }}>
                          {round.status}
                        </span>
                      </td>
                      <td style={{
                        padding: '1rem',
                        fontSize: '0.9rem',
                        color: '#666'
                      }}>
                        {formatDate(round.start_datetime)}
                      </td>
                      <td style={{
                        padding: '1rem',
                        fontSize: '0.9rem',
                        color: '#666'
                      }}>
                        {round.end_datetime ? formatDate(round.end_datetime) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
