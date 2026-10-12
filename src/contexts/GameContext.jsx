import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const GameContext = createContext(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

const STORAGE_KEY = 'traz_current_user';

export const GameProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Error loading stored session:', e);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync state changes with localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error syncing user to localStorage:', e);
    }
  }, [currentUser]);

  /**
   * Universal Login Handler
   * @param {'admin' | 'team' | 'bridge' | 'attacker'} type
   * @param {Object} credentials
   */
  const login = async (type, credentials = {}) => {
    setLoading(true);
    try {
      if (type === 'admin') {
        const { username, password } = credentials;
        const validUser = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
        const validPass = import.meta.env.VITE_ADMIN_PASSWORD || 'cyberctf2026';

        if (username?.trim() === validUser && password === validPass) {
          const userObj = {
            role: 'admin',
            username: validUser,
            teamId: null,
            gameId: null,
            loggedInAt: new Date().toISOString()
          };
          setCurrentUser(userObj);
          return { success: true, user: userObj };
        } else {
          return { success: false, error: 'Invalid admin credentials' };
        }
      }

      if (type === 'team') {
        const rawCode = (credentials.teamCode || credentials.code || '').trim().toUpperCase();
        if (!rawCode) {
          return { success: false, error: 'Team code is required' };
        }

        const { data: team, error } = await supabase
          .from('teams')
          .select('*')
          .eq('team_code', rawCode)
          .maybeSingle();

        if (error) {
          console.error('Database query error during team login:', error);
          return { success: false, error: 'Database error: ' + error.message };
        }

        if (!team) {
          return { success: false, error: 'Invalid team code. System access denied.' };
        }

        const isFirstLogin = !team.first_login_done;
        if (isFirstLogin) {
          const { error: updateError } = await supabase
            .from('teams')
            .update({ first_login_done: true })
            .eq('id', team.id);

          if (updateError) {
            console.warn('Failed to update first_login_done status:', updateError);
          } else {
            team.first_login_done = true;
          }
        }

        const userObj = {
          role: 'team',
          teamId: team.id,
          teamName: team.name,
          teamCode: team.team_code,
          gameId: team.game_id,
          opponentId: team.opponent_id,
          systemUsername: team.system_username,
          systemPassword: team.system_password,
          isFirstLogin,
          loggedInAt: new Date().toISOString()
        };

        try {
          sessionStorage.setItem('traz_team_id', team.id);
          if (team.game_id) sessionStorage.setItem('traz_game_id', team.game_id);
          if (team.opponent_id) sessionStorage.setItem('traz_opponent_id', team.opponent_id);
        } catch (e) {
          console.warn('[GameContext] sessionStorage write error:', e);
        }

        setCurrentUser(userObj);
        return { success: true, user: userObj, team };
      }

      if (type === 'bridge' || type === 'attacker') {
        const rawCode = (credentials.bridgeCode || credentials.code || '').trim().toUpperCase();
        if (!rawCode) {
          return { success: false, error: 'Access code is required' };
        }

        // Bridge login checks bridge_code against the teams table
        const { data: attackerTeam, error } = await supabase
          .from('teams')
          .select('*')
          .eq('bridge_code', rawCode)
          .maybeSingle();

        if (error) {
          console.error('Database error during bridge lookup:', error);
          return { success: false, error: 'Database error: ' + error.message };
        }

        if (!attackerTeam) {
          return { success: false, error: 'Invalid breach access code. Clearance rejected.' };
        }

        // Resolve the opponent team
        let opponentTeam = null;
        let opponentTeamId = attackerTeam.opponent_id;

        if (opponentTeamId) {
          const { data: opp, error: oppErr } = await supabase
            .from('teams')
            .select('*')
            .eq('id', opponentTeamId)
            .maybeSingle();

          if (!oppErr && opp) {
            opponentTeam = opp;
          }
        }

        // Fallback: If opponent_id was not explicitly linked, find by game_id
        if (!opponentTeam && attackerTeam.game_id) {
          const { data: opp, error: oppErr } = await supabase
            .from('teams')
            .select('*')
            .eq('game_id', attackerTeam.game_id)
            .neq('id', attackerTeam.id)
            .maybeSingle();

          if (!oppErr && opp) {
            opponentTeam = opp;
            opponentTeamId = opp.id;
          }
        }

        if (!opponentTeamId) {
          return { 
            success: false, 
            error: 'Target system unresolvable. Opponent node offline or unassigned.' 
          };
        }

        const userObj = {
          role: 'attacker',
          teamId: attackerTeam.id,
          attackerTeamId: attackerTeam.id,
          attackerTeamName: attackerTeam.name,
          targetTeamId: opponentTeamId,
          targetTeamName: opponentTeam ? opponentTeam.name : 'Target Node',
          gameId: attackerTeam.game_id,
          bridgeCode: attackerTeam.bridge_code,
          loggedInAt: new Date().toISOString()
        };

        try {
          sessionStorage.setItem('traz_attacker_team_id', attackerTeam.id);
          sessionStorage.setItem('traz_team_id', attackerTeam.id);
          sessionStorage.setItem('traz_target_team_id', opponentTeamId);
          if (attackerTeam.game_id) sessionStorage.setItem('traz_game_id', attackerTeam.game_id);
        } catch (e) {
          console.warn('[GameContext] sessionStorage write error:', e);
        }

        setCurrentUser(userObj);
        return { 
          success: true, 
          user: userObj, 
          attackerTeam, 
          opponentTeam, 
          opponentTeamId 
        };
      }

      return { success: false, error: `Unknown authentication realm: ${type}` };
    } catch (err) {
      console.error('Login exception:', err);
      return { success: false, error: err.message || 'Authentication error' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error removing local session:', e);
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    login,
    logout,
    loading,
    supabase
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export default GameContext;
