import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { computeRoundStatus } from '../utils/round';
import type { RoundDetailResponse, RoundFinishedResponse } from '../types/api';
import gussReady from '../assets/guss_ready.png';
import gussStop from '../assets/guss_stop.png';
import gussTapped from '../assets/guss_tapped.png';
import './RoundPage.css';

type RoundData = RoundDetailResponse | RoundFinishedResponse;

function isFinishedResponse(data: RoundData): data is RoundFinishedResponse {
  return 'totalScore' in data;
}

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const RoundPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTapping, setIsTapping] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const hasReloadedOnFinish = useRef(false);

  const username = apiService.getUsername();

  const fetchRoundData = useCallback(async () => {
    if (!uuid) return;
    try {
      setLoading(true);
      const data = await apiService.getRound(uuid);
      setRoundData(data);
      setMyScore(data.currentUserScore);
    } catch {
      setError('Ошибка загрузки данных раунда');
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  // Fetch round data
  useEffect(() => {
    fetchRoundData();
  }, [fetchRoundData]);

  // Ticker — update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // When round finishes — reload data from server (for results)
  useEffect(() => {
    if (!roundData || hasReloadedOnFinish.current) return;

    const status = computeRoundStatus(
      roundData.round.start_datetime,
      roundData.round.end_datetime,
      currentTime,
    );

    if (status === 'finished' && !isFinishedResponse(roundData)) {
      hasReloadedOnFinish.current = true;
      fetchRoundData();
    }
  }, [currentTime, roundData, fetchRoundData]);

  // Tap handler
  const handleTap = async () => {
    if (!uuid || isTapping) return;
    try {
      setIsTapping(true);
      const response = await apiService.tap(uuid);
      setMyScore((prev) => Math.max(prev, response.score));
    } catch {
      // Tap may have failed (round ended) — ignore
    } finally {
      setTimeout(() => setIsTapping(false), 80);
    }
  };

  if (loading) {
    return (
      <div className="round-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error || !roundData) {
    return (
      <div className="round-page">
        <div className="error">{error ?? 'Раунд не найден'}</div>
        <Link to="/" className="back-button">Раунды</Link>
      </div>
    );
  }

  const { round } = roundData;
  const startTime = new Date(round.start_datetime);
  const endTime = new Date(round.end_datetime);

  const status = computeRoundStatus(round.start_datetime, round.end_datetime, currentTime);
  const isActive = status === 'active';
  const isCooldown = status === 'cooldown';
  const isFinished = status === 'finished';

  const timeUntilStart = startTime.getTime() - currentTime.getTime();
  const timeUntilEnd = endTime.getTime() - currentTime.getTime();

  const getImage = () => {
    if (isTapping && isActive) return gussTapped;
    if (isActive) return gussReady;
    return gussStop;
  };

  const statusTitle = isCooldown
    ? 'Cooldown'
    : isActive
      ? 'Раунд активен!'
      : 'Раунд завершен';

  return (
    <div className="round-page">
      <div className="round-header">
        <Link to="/" className="back-button">Раунды</Link>
        <span className="username-badge">{username}</span>
      </div>

      <div className="guss-container">
        <img
          src={getImage()}
          alt="Guss"
          className={`guss-image ${isActive ? 'clickable' : ''} ${isTapping ? 'tapping' : ''}`}
          onClick={isActive ? handleTap : undefined}
          draggable={false}
        />
      </div>

      <div className="round-info">
        <h2>{statusTitle}</h2>

        {isCooldown && (
          <div className="countdown">
            <div className="countdown-label">до начала раунда</div>
            <div className="countdown-timer">{formatTime(timeUntilStart)}</div>
          </div>
        )}

        {isActive && (
          <>
            <div className="countdown">
              <div className="countdown-label">До конца осталось:</div>
              <div className="countdown-timer">{formatTime(timeUntilEnd)}</div>
            </div>
            <div className="score-section">
              <h3>Мои очки — {myScore}</h3>
            </div>
          </>
        )}

        {isFinished && isFinishedResponse(roundData) && (
          <div className="round-results">
            <div className="results-grid">
              <div className="result-item">
                <span className="result-label">Всего</span>
                <span className="result-value">{roundData.totalScore}</span>
              </div>
              {roundData.bestPlayer && (
                <div className="result-item">
                  <span className="result-label">
                    Победитель — {roundData.bestPlayer.username}
                  </span>
                  <span className="result-value">{roundData.bestPlayer.score}</span>
                </div>
              )}
              <div className="result-item">
                <span className="result-label">Мои очки</span>
                <span className="result-value">{roundData.currentUserScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoundPage;
