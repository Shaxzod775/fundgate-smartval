import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { numberLocale } from '../../utils/formatNumber';
import { useOutletContext } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Send, Plus, FileText, TrendingUp, Users, Paperclip, PanelRight, Copy, Share2, ClipboardList, Lightbulb, BrainCircuit, Check, Image as ImageIcon, FileUp, Loader2, X, Trash2, User, CheckCircle, Rocket, Search, BarChart3, Target, Zap, Star, AlertCircle, Info, HelpCircle, Pin, Wallet, AlertTriangle, CircleHelp, XCircle, PenLine, Building2, MapPin, ArrowRight, ThumbsUp, ThumbsDown, Clock, Calendar, Award, Flag, Bookmark, Link2, Globe, Shield, Lock, Unlock, Eye, Settings, Folder, Database, Server, Code, Terminal, Gift, Heart, Smile, Frown, Meh, MessageCircle, Phone, Mail, Bell, Volume2, Music, Camera, Video, Mic, Hash, AtSign, Percent, DollarSign, CreditCard, ShoppingCart, Package, Truck, Home, Briefcase, GraduationCap, BookOpen, FileQuestion, CircleDollarSign, Coins, PiggyBank, Receipt, TrendingDown, Activity, PieChart, LineChart, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronDown, ListChecks, ClipboardCheck, MessageSquare, Megaphone, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AttachedFile {
  id: string;
  file: File;
  type: 'image' | 'document';
  preview?: string;
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_TOTAL_ATTACHMENTS = 3;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];
import { PageTransition } from '../../styles/animations';
import { StartupLogo } from '../../components/ui/StartupLogo';
import { AIArtifact } from '../../components/ai/AIArtifact';
import { aiApi, aiChatApi, AIMessage, AIStreamEvent, StartupWidgetData, AIChatMessage, AIChatThread, AIArtifactPayload } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CrmImage } from '../../components/ui/CrmImage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  startupWidget?: StartupWidgetData;
  startupsList?: StartupWidgetData[];
  artifact?: AIArtifactPayload;
}

interface Thread {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
  firebaseId?: string; // Firebase document ID for syncing
}

const CHATKIT_COLORS = {
  bg: {
    primary: '#0b0b0b',
    secondary: '#151515',
    tertiary: '#1f1f1f',
    hover: '#27272a',
    input: 'rgba(255, 255, 255, 0.05)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
  },
  accent: '#10b981',
  accentHover: '#059669',
  border: 'rgba(255, 255, 255, 0.1)',
};

const slideInFromRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div<{ $sidebarWidth: number }>`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: ${({ $sidebarWidth }) => $sidebarWidth}px;
  display: flex;
  background: ${({ theme }) => theme.colors.bg.primary};
  font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  z-index: 1;
  transition: left 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:focus, &:focus-visible {
    outline: none !important;
    border: none !important;
  }

  @media (max-width: 768px) {
    left: 0;
  }
`;

const SidebarOverlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.colors.bg.overlay};
  backdrop-filter: blur(4px);
  z-index: 1000;
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  pointer-events: ${({ $isOpen }) => ($isOpen ? 'auto' : 'none')};
  transition: opacity 0.3s ease-in-out;
`;

const HistorySidebar = styled.aside<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 280px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-left: 1px solid ${({ theme }) => theme.colors.border.secondary};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 1001;
  transform: translateX(${({ $isOpen }) => ($isOpen ? '0' : '100%')});
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: ${({ theme, $isOpen }) => ($isOpen ? theme.shadows.xl : 'none')};
`;

const SidebarHeader = styled.div`
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SidebarTitle = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.02em;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 6px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }
`;

const NewChatButton = styled.button`
  margin: 0 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.bg.card};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ theme }) => theme.colors.border.primary};
    transform: translateY(-1px);
  }

  svg {
    width: 16px;
    height: 16px;
    color: inherit;
  }
`;

const ThreadsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 12px 16px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-radius: 2px;
  }
`;

const ThreadItem = styled.div<{ $active: boolean }>`
  padding: 10px 14px;
  padding-right: 36px;
  border-radius: 8px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: all 0.15s ease-out;
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  border: 1px solid transparent;
  position: relative;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:hover .thread-delete-btn {
    opacity: 1;
  }

  ${({ $active }) => $active && `
    &::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: ${CHATKIT_COLORS.accent};
    }
  `}
`;

const ThreadDeleteButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ThreadTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 8px;
`;

const ThreadPreview = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 8px;
`;

const ThreadsLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
  gap: 8px;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const EmptyThreads = styled.div`
  text-align: center;
  padding: 20px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 14px;
`;

const ToggleButton = styled.button`
  pointer-events: auto;
  width: 36px;
  height: 36px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;
  outline: none !important;
  -webkit-tap-highlight-color: transparent;
  box-shadow: none !important;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.cardHover};
  }

  &:focus, &:focus-visible {
    outline: none !important;
    box-shadow: none !important;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const MainArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg.primary};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0; /* Important for flex children to respect overflow */
  overflow: hidden;
`;

const Header = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const HeaderNewChatButton = styled.button`
  pointer-events: auto;
  position: absolute;
  right: 24px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  outline: none;
  -webkit-tap-highlight-color: transparent;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${({ theme }) => theme.colors.border.primary};
  }

  &:focus {
    outline: none;
    box-shadow: none;
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  @media (max-width: 768px) {
    right: 16px;
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const TopRightButtons = styled.div`
  pointer-events: auto;
  position: fixed;
  right: 16px;
  top: 16px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 12px;
  padding: 4px;
  backdrop-filter: blur(10px);
  z-index: 10;

  @media (max-width: 768px) {
    right: 12px;
    top: 12px;
  }
`;

const MessagesContainer = styled.div<{ $hasMessages: boolean }>`
  flex: 1;
  min-height: 0; /* Important for flex overflow to work */
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  /* Отступ сверху для fixed кнопок */
  padding-top: 70px;
  /* Отступ снизу для fixed composer */
  padding-bottom: 120px;

  /* Fade effect at top when scrolling */
  &::before {
    content: '';
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    height: 80px;
    background: ${({ theme }) => `linear-gradient(to bottom, ${theme.colors.bg.primary} 0%, ${theme.colors.bg.primary} 20%, transparent 100%)`};
    pointer-events: none;
    z-index: 5;
    margin-bottom: -80px;
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-radius: 3px;
  }

  @media (max-width: 768px) {
    padding-top: 60px;
    padding-bottom: 100px;
  }
`;

const StartScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
`;

const StartTitle = styled.h2`
  font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  letter-spacing: -0.02em;
  font-size: 28px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 12px 0;
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'light'
      ? 'none'
      : 'linear-gradient(to right, #fff, rgba(255, 255, 255, 0.7))'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: ${({ theme }) => (theme.mode === 'light' ? 'currentColor' : 'transparent')};
  padding: 4px;

  @media (max-width: 480px) {
    font-size: 24px;
  }
`;

const StartSubtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 40px 0;
  text-align: center;
  line-height: 1.6;
  max-width: 420px;

  @media (max-width: 480px) {
    font-size: 14px;
    margin: 0 0 24px 0;
  }
`;

const PromptsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  width: 100%;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const PromptCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  text-align: left;
  min-height: 60px;

  @media (max-width: 480px) {
    padding: 12px 16px;
    min-height: 48px;
    gap: 10px;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.bg.cardHover};
    border-color: ${CHATKIT_COLORS.accent};
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
    
    svg {
      color: ${CHATKIT_COLORS.accent};
    }
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: color 0.2s ease;
    flex-shrink: 0;
  }
`;

const PromptLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`;

const MessagesArea = styled.div<{ $hasMessages: boolean }>`
  padding: 20px 0 40px;
  /* ChatGPT-style: большой padding внизу для прокрутки последнего сообщения наверх viewport */
  padding-bottom: ${({ $hasMessages }) => ($hasMessages ? 'calc(100vh - 250px)' : '40px')};
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
`;

const MessageGroup = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: ${({ $isUser }) => ($isUser ? '0 24px' : '0 0 0 24px')};
  justify-content: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  /* ChatGPT-style: scroll-margin-top для правильного позиционирования при scrollIntoView */
  scroll-margin-top: ${({ $isUser }) => ($isUser ? '24px' : '0')};
  /* Animation for new messages */
  animation: ${({ $isUser }) => ($isUser ? slideInFromRight : fadeInUp)} 0.3s ease-out;

  &:first-child {
    margin-top: 60px;
  }

  @media (max-width: 768px) {
    padding: ${({ $isUser }) => ($isUser ? '0 16px' : '0 0 0 16px')};
  }
`;

const MessageContent = styled.div<{ $isUser: boolean }>`
  flex: 0 1 auto;
  max-width: ${({ $isUser }) => ($isUser ? '65%' : '100%')};
  min-width: 0;
  padding: ${({ $isUser }) => ($isUser ? '12px 18px' : '0')};
  background: ${({ theme, $isUser }) => ($isUser ? theme.colors.bg.secondary : 'transparent')};
  border: none;
  border-radius: ${({ $isUser }) => ($isUser ? '20px 4px 20px 20px' : '0')};
  box-shadow: ${({ $isUser }) => ($isUser ? '0 2px 4px rgba(0,0,0,0.05)' : 'none')};

  @media (max-width: 768px) {
    max-width: ${({ $isUser }) => ($isUser ? '60%' : '100%')};
  }
`;

const MessageText = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const emojiToIcon: Record<string, React.ReactNode> = {
  '✅': <CheckCircle size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '✓': <Check size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '☑️': <ClipboardCheck size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,

  '⚠️': <AlertTriangle size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '❗': <AlertCircle size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '❌': <XCircle size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '🚫': <XCircle size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,

  '❓': <CircleHelp size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '?': <CircleHelp size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🤔': <CircleHelp size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  'ℹ️': <Info size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,

  '💰': <CircleDollarSign size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '💵': <DollarSign size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '💸': <Coins size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🪙': <Coins size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '💳': <CreditCard size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '🏦': <Building2 size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🏢': <Building2 size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '💼': <Briefcase size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🧾': <Receipt size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,

  '📊': <BarChart3 size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '📈': <TrendingUp size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '📉': <TrendingDown size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '📐': <Activity size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '🥧': <PieChart size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,

  '🚀': <Rocket size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🎯': <Target size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '⚡': <Zap size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🔥': <Sparkles size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '✨': <Sparkles size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '⭐': <Star size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🌟': <Star size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🏆': <Award size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🎖️': <Award size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🏅': <Award size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🥇': <Award size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,

  '📌': <Pin size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '📍': <MapPin size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '📋': <ClipboardList size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '📝': <PenLine size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📄': <FileText size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '📁': <Folder size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '📂': <Folder size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🔖': <Bookmark size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '🏷️': <Bookmark size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,

  '🔍': <Search size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '🔎': <Search size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '👁️': <Eye size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '👀': <Eye size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,

  '💡': <Lightbulb size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🧠': <BrainCircuit size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '💭': <MessageCircle size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '💬': <MessageSquare size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🗣️': <Megaphone size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📢': <Megaphone size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,

  '👋': <User size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '👤': <User size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '👥': <Users size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🤝': <Users size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '🙋': <User size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🎓': <GraduationCap size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '📚': <BookOpen size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📖': <BookOpen size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,

  '⏰': <Clock size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🕐': <Clock size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '⌛': <Clock size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '⏳': <Clock size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '📅': <Calendar size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📆': <Calendar size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,

  '➡️': <ArrowRight size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '▶️': <ChevronRight size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🔼': <ArrowUpRight size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '🔽': <ArrowDownRight size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '↗️': <ArrowUpRight size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '↘️': <ArrowDownRight size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,

  '👍': <ThumbsUp size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '👎': <ThumbsDown size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '❤️': <Heart size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '💚': <Heart size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '😊': <Smile size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '😃': <Smile size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '😀': <Smile size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🙂': <Smile size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '😞': <Frown size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '😟': <Frown size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '😐': <Meh size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,

  '🔒': <Lock size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🔓': <Unlock size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '🛡️': <Shield size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🔐': <Lock size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,

  '⚙️': <Settings size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🔧': <Settings size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🔗': <Link2 size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🌐': <Globe size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '💻': <Code size={16} style={{ color: '#8b5cf6', verticalAlign: 'middle' }} />,
  '🖥️': <Terminal size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '📱': <Phone size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📧': <Mail size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '✉️': <Mail size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🔔': <Bell size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,

  '🛒': <ShoppingCart size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '📦': <Package size={16} style={{ color: '#f59e0b', verticalAlign: 'middle' }} />,
  '🚚': <Truck size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '🎁': <Gift size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,

  '🏠': <Home size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '🏡': <Home size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,

  '🚩': <Flag size={16} style={{ color: '#ef4444', verticalAlign: 'middle' }} />,
  '🏁': <Flag size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '#️⃣': <Hash size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,

  '📃': <ListChecks size={16} style={{ color: '#3b82f6', verticalAlign: 'middle' }} />,
  '✔️': <Check size={16} style={{ color: '#22c55e', verticalAlign: 'middle' }} />,
  '➤': <ChevronRight size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
  '•': <ChevronRight size={16} style={{ color: '#6b7280', verticalAlign: 'middle' }} />,
};

const replaceEmojisWithIcons = (text: string): React.ReactNode[] => {
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{FE00}-\u{FE0F}]|[\u{200D}]|[✅✓❗❓⭐⚡🔍📊🎯💡🚀📋👋📈ℹ️⚠️❌📌📍💰💵💳🏢💼📝📄🔖🔎💭💬📢👤👥⏰📅➡️▶️👍👎❤️🔒🔓🛡️⚙️🔧🔗🌐💻📱📧🔔🛒📦🚚🎁🏠🚩•➤✔️📃#️⃣☑️🤔🧠✨🔥🏆🎖️🏅🥇📈📉🏦🧾📂📁🕐⌛⏳📆🔼🔽💚😊😃😀🙂😞😟😐🔐🖥️✉️🏡🏁]/gu;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = emojiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const emoji = match[0];
    const icon = emojiToIcon[emoji];
    if (icon) {
      parts.push(<span key={keyIndex++}>{icon}</span>);
    } else {
      parts.push('');
    }

    lastIndex = match.index + emoji.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

const MarkdownWrapper = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  line-height: 1.7;

  p {
    margin: 0 0 12px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  code {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
  }

  pre {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 12px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  a {
    color: #3b82f6;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }

  h1, h2, h3, h4 {
    margin: 16px 0 8px 0;
    font-weight: 600;
  }

  h1 { font-size: 20px; }
  h2 { font-size: 18px; }
  h3 { font-size: 16px; }

  blockquote {
    border-left: 3px solid ${CHATKIT_COLORS.accent};
    padding-left: 12px;
    margin: 12px 0;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
  }

  th, td {
    border: 1px solid ${({ theme }) => theme.colors.border.secondary};
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    font-weight: 600;
  }
`;

const processChildren = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === 'string') {
    return replaceEmojisWithIcons(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        return <span key={index}>{replaceEmojisWithIcons(child)}</span>;
      }
      return child;
    });
  }
  return children;
};

const MarkdownText = ({ text }: { text: string }) => {
  return (
    <MarkdownWrapper>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
          td: ({ children }) => <td>{processChildren(children)}</td>,
          th: ({ children }) => <th>{processChildren(children)}</th>,
          h1: ({ children }) => <h1>{processChildren(children)}</h1>,
          h2: ({ children }) => <h2>{processChildren(children)}</h2>,
          h3: ({ children }) => <h3>{processChildren(children)}</h3>,
          h4: ({ children }) => <h4>{processChildren(children)}</h4>,
          strong: ({ children }) => <strong>{processChildren(children)}</strong>,
          em: ({ children }) => <em>{processChildren(children)}</em>,
          a: ({ href, children }) => <a href={href}>{processChildren(children)}</a>,
          blockquote: ({ children }) => <blockquote>{processChildren(children)}</blockquote>,
        }}
      >
        {text}
      </ReactMarkdown>
    </MarkdownWrapper>
  );
};

const MessageActions = styled.div`
  display: flex;
  gap: 8px; /* Tighter gap for icons only */
  margin-top: 8px;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%; /* Circle for icons */
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  gap: 4px;
  padding: 8px 0;

  span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${CHATKIT_COLORS.accent};
    animation: typing 1.4s infinite ease-in-out;
    opacity: 0.6;

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }

  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
`;

const ToolLoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  margin: 8px 0;
  color: ${CHATKIT_COLORS.accent};
  font-size: 14px;
  font-weight: 500;

  svg {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const StreamingText = styled.span`
  &::after {
    content: '|';
    animation: blink 1s step-end infinite;
    color: ${CHATKIT_COLORS.accent};
    margin-left: 2px;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

const ComposerWrapper = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 16px 24px 32px;
  background: ${({ theme }) => `linear-gradient(to top, ${theme.colors.bg.primary} 80%, transparent 100%)`};

  @media (max-width: 768px) {
    padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  }
`;

const ComposerContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const ComposerInner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 8px 8px; /* Balanced padding */
  background: ${({ theme }) => (theme.mode === 'light' ? theme.colors.bg.input : 'rgba(20, 20, 20, 0.8)')};
  border: 1px solid ${({ theme }) => theme.colors.border.input}; /* Modern border */
  border-radius: 9999px; /* Max Rounding */
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  box-shadow: ${({ theme }) => theme.shadows.md};

  &:focus-within {
     background: ${({ theme }) => (theme.mode === 'light' ? theme.colors.bg.inputFocus : 'rgba(30, 30, 30, 0.8)')};
     border-color: ${CHATKIT_COLORS.accent}; /* Highlight on focus */
     box-shadow: 0 4px 24px rgba(16, 185, 129, 0.15); /* Green glow */
  }
`;

const ToolsMenu = styled.div<{ $isClosing: boolean }>`
  position: absolute;
  bottom: 100%; /* Above the composer */
  left: 0;
  margin-bottom: 20px;
  background: ${({ theme }) => theme.colors.bg.dropdown};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 16px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  backdrop-filter: blur(20px);
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 220px;
  z-index: 30;
  transform-origin: bottom left;
  
  /* Animation Logic */
  animation: ${({ $isClosing }) => ($isClosing ? 'slideDownFade 0.3s cubic-bezier(0.33, 1, 0.68, 1) forwards' : 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards')};
  pointer-events: ${({ $isClosing }) => ($isClosing ? 'none' : 'auto')};

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  @keyframes slideDownFade {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(10px) scale(0.95); }
  }
`;

const AttachMenu = styled(ToolsMenu)`
  left: auto;
  min-width: 180px;
`;

const ToolItem = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: ${({ $selected }) => ($selected ? 'rgba(16, 185, 129, 0.1)' : 'transparent')};
  border: 1px solid ${({ $selected }) => ($selected ? 'rgba(16, 185, 129, 0.2)' : 'transparent')};
  border-radius: 10px;
  color: ${({ theme, $selected }) => ($selected ? theme.colors.text.primary : theme.colors.text.secondary)};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  width: 100%; /* Ensure full width clickable */

  &:hover {
    background: ${({ theme, $selected }) => ($selected ? 'rgba(16, 185, 129, 0.15)' : theme.colors.bg.cardHover)};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  svg {
    width: 18px;
    height: 18px;
    color: ${({ theme, $selected }) => ($selected ? CHATKIT_COLORS.accent : theme.colors.text.secondary)};
  }

  span {
    flex: 1;
  }
  
  /* Checkmark styling */
  svg.check-icon {
    width: 14px;
    height: 14px;
    color: ${CHATKIT_COLORS.accent};
    margin-left: auto; /* Push to right */
    opacity: ${({ $selected }) => ($selected ? 1 : 0)};
    transform: ${({ $selected }) => ($selected ? 'scale(1)' : 'scale(0.8)')};
    transition: all 0.2s;
  }
`;

const AttachButton = styled.button<{ $active?: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.tertiary : 'transparent')};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.border.subtle : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.tertiary)};
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.bg.tertiary};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;


const ComposerTextarea = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 16px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  min-height: 20px;
  line-height: 20px;
  padding: 0 8px;
  margin: 2px 0;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  @media (max-width: 768px) {
    text-align: left;
  }
`;

const SendButton = styled.button<{ $disabled: boolean }>`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.bg.tertiary : CHATKIT_COLORS.accent};
  border: none;
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.tertiary : '#ffffff'};
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;

  &:hover:not(:disabled) {
    transform: scale(1.1);
    background: ${CHATKIT_COLORS.accentHover};
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;


const AttachmentsPreview = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const AttachmentItem = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  max-width: 180px;
`;

const AttachmentImagePreview = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
`;

const AttachmentIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg.input};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const AttachmentInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const AttachmentName = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AttachmentSize = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const RemoveAttachmentButton = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 50%;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #ef4444;
    color: white;
    border-color: #ef4444;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const StartupWidgetCard = styled.div`
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  max-width: 380px;
  min-width: 320px;

  &:hover {
    border-color: ${CHATKIT_COLORS.accent};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
  }
`;

const WidgetHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 14px;
`;

const WidgetLogo = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: ${CHATKIT_COLORS.accent};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const WidgetInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const WidgetName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const WidgetIndustry = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 8px;
`;

const WidgetBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const WidgetBadge = styled.div<{ $variant: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }>`
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: ${({ $variant }) => {
    switch ($variant) {
      case 'success': return 'rgba(16, 185, 129, 0.15)';
      case 'info': return 'rgba(59, 130, 246, 0.15)';
      case 'warning': return 'rgba(245, 158, 11, 0.15)';
      case 'danger': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  }};
  color: ${({ $variant }) => {
    switch ($variant) {
      case 'success': return '#10b981';
      case 'info': return '#3b82f6';
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      default: return '#9ca3af';
    }
  }};
`;

const WidgetStatus = styled.div<{ $status: string }>`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ $status }) => {
    switch ($status) {
      case 'portfolio': return 'rgba(16, 185, 129, 0.15)';
      case 'pipeline': return 'rgba(59, 130, 246, 0.15)';
      case 'in_review': return 'rgba(245, 158, 11, 0.15)';
      case 'rejected': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'portfolio': return '#10b981';
      case 'pipeline': return '#3b82f6';
      case 'in_review': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const WidgetInvestmentCard = styled.div`
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const InvestmentLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #10b981;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
`;

const InvestmentValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const InvestmentBadge = styled.div`
  background: #10b981;
  color: white;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
`;

const WidgetManagerSection = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.secondary};
  margin-bottom: 12px;
`;

const WidgetManagerLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`;

const WidgetManagerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const WidgetManagerAvatar = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 2px solid ${CHATKIT_COLORS.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const WidgetManagerName = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 500;
`;

const WidgetDescription = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const WidgetMeta = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const WidgetMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const WidgetMetaLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const WidgetMetaValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const WidgetScore = styled.div<{ $score: number }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $score }) => {
    if ($score >= 80) return '#10b981';
    if ($score >= 60) return '#f59e0b';
    return '#ef4444';
  }};
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '★';
    font-size: 12px;
  }
`;

const WidgetAISection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const WidgetAITitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const WidgetAIList = styled.ul`
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;

  li {
    margin-bottom: 4px;
    &::marker {
      color: ${CHATKIT_COLORS.accent};
    }
  }
`;

const WidgetRecommendation = styled.div<{ $rec: string }>`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 8px;
  background: ${({ $rec }) => {
    switch ($rec) {
      case 'strong_buy':
      case 'buy': return 'rgba(16, 185, 129, 0.15)';
      case 'hold': return 'rgba(245, 158, 11, 0.15)';
      case 'pass':
      case 'sell': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  }};
  color: ${({ $rec }) => {
    switch ($rec) {
      case 'strong_buy':
      case 'buy': return '#10b981';
      case 'hold': return '#f59e0b';
      case 'pass':
      case 'sell': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const StartupsListContainer = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  overflow-x: auto;
  padding: 12px 0;
  margin: 12px 0;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.bg.tertiary};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.primary};
    border-radius: 3px;
  }
`;

const StartupListCard = styled.div`
  flex-shrink: 0;
  width: 280px;
  height: 400px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.colors.bg.card};
  border: 1px solid ${({ theme }) => theme.colors.border.secondary};
  border-radius: 14px;
  padding: 16px;
  cursor: default;
  transition: all 0.2s ease;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ListCardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  min-height: 40px;
`;

const ListCardInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListCardName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListCardIndustry = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ListCardStatus = styled.div<{ $status: string }>`
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${({ $status }) => {
    switch ($status) {
      case 'portfolio': return 'rgba(16, 185, 129, 0.15)';
      case 'pipeline': return 'rgba(59, 130, 246, 0.15)';
      case 'in_review': return 'rgba(245, 158, 11, 0.15)';
      case 'rejected': return 'rgba(239, 68, 68, 0.15)';
      default: return 'rgba(107, 114, 128, 0.15)';
    }
  }};
  color: ${({ $status }) => {
    switch ($status) {
      case 'portfolio': return '#10b981';
      case 'pipeline': return '#3b82f6';
      case 'in_review': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const ListCardMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.secondary};
`;

const ListCardScore = styled.div<{ $score: number }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $score }) => {
    if ($score >= 80) return '#10b981';
    if ($score >= 60) return '#f59e0b';
    return '#ef4444';
  }};
  display: flex;
  align-items: center;
  gap: 3px;

  &::before {
    content: '★';
    font-size: 11px;
  }
`;

const ListCardFunding = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 500;
`;

const ListCardDescription = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
  margin: 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ListCardScoreSection = styled.div`
  height: 4px;
  margin: 6px 0 10px;

  &:empty {
    display: none;
    height: 0;
    margin: 0;
  }
`;

const ListCardScoreHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const ListCardScoreLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const ListCardScoreValue = styled.span<{ $score: number }>`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $score }) => {
    if ($score >= 80) return '#10b981';
    if ($score >= 60) return '#f59e0b';
    return '#ef4444';
  }};
`;

const ListCardProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 2px;
  overflow: hidden;
`;

const ListCardProgressFill = styled.div<{ $score: number }>`
  height: 100%;
  width: ${({ $score }) => $score}%;
  background: ${({ $score }) => {
    if ($score >= 80) return 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
    if ($score >= 60) return 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    return 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
  }};
  border-radius: 2px;
  transition: width 0.5s ease;
`;

const ListCardMetricsRow = styled.div`
  display: flex;
  gap: 12px;
  margin: 10px 0;
  flex-wrap: wrap;
`;

const ListCardMetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 12px;
    height: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ListCardManagerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  margin-top: 8px;
`;

const ListCardManagerAvatar = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border: 1.5px solid ${CHATKIT_COLORS.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 10px;
    height: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ListCardManagerName = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListCardActionButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  margin-top: auto;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  color: ${CHATKIT_COLORS.accent};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
  }
`;

const ListCardStageTag = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  padding: 2px 6px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-radius: 4px;
  margin-left: 6px;
`;

const ListCardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  min-height: 25px;
  flex-wrap: wrap;

  &:empty,
  &:has(> :only-child:empty) {
    display: none;
    min-height: 0;
    margin: 0;
  }
`;

const ListCardScoreBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #f59e0b;
  white-space: nowrap;

  svg { width: 13px; height: 13px; }
  .label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    opacity: 0.85;
  }
  .value { font-size: 16px; font-weight: 700; line-height: 1; }
`;

const ListCardBadgeRow = styled.div`
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const cardBadgeTones: Record<string, { bg: string; fg: string }> = {
  gold: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#f59e0b' },
  green: { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10b981' },
  blue: { bg: 'rgba(59, 130, 246, 0.12)', fg: '#60a5fa' },
  gray: { bg: 'rgba(107, 114, 128, 0.14)', fg: '#9ca3af' },
};

const ListCardBadge = styled.span<{ $tone: 'gold' | 'green' | 'blue' | 'gray' }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ $tone }) => cardBadgeTones[$tone].bg};
  color: ${({ $tone }) => cardBadgeTones[$tone].fg};
  white-space: nowrap;
`;

const ReasoningBlock = styled.div`
  flex: 1;
  min-height: 0;
  margin: 0 0 12px;
  padding: 10px 12px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 10px;
  overflow: hidden;
`;

const ReasoningTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 8px;

  svg { width: 13px; height: 13px; }
`;

const ReasoningList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ReasoningItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow-wrap: anywhere;

  svg {
    width: 12px;
    height: 12px;
    color: #10b981;
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const MetricChipsRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 4px;
  min-height: 30px;
`;

const MetricChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg { width: 12px; height: 12px; color: #10b981; }
`;


const toolTranslationKeys: string[] = [
  'get_all_startups',
  'get_startup_details',
  'update_startup',
  'web_search',
  'get_managers',
  'compare_startups',
  'get_portfolio_stats',
  'calculate_valuation',
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

type CardTranslate = (key: string, options?: Record<string, unknown>) => string;
type CardBadge = { icon: string; label: string; tone: 'gold' | 'green' | 'blue' | 'gray' };

const shortenReason = (text: string): string => {
  const clean = String(text || '').trim().replace(/\s+/g, ' ');
  if (clean.length <= 54) return clean;
  return `${clean.slice(0, 52).trimEnd()}…`;
};

const deriveAiReasons = (s: StartupWidgetData, t: CardTranslate): string[] => {
  const reasons: string[] = [];
  const seen = new Set<string>();
  const push = (raw?: string) => {
    if (!raw || reasons.length >= 4) return;
    const value = shortenReason(raw);
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      reasons.push(value);
    }
  };

  (s.strengths || []).forEach(push);

  if (reasons.length < 2) {
    if (typeof s.score === 'number' && s.score >= 80) push(t('ai.reasoning.derived.highScore', { defaultValue: 'Exceptional AI score' }));
    if (s.revenue && s.revenue > 0) push(t('ai.reasoning.derived.revenue', { defaultValue: 'Already generating revenue' }));
    if (s.teamSize && s.teamSize >= 4) push(t('ai.reasoning.derived.team', { defaultValue: 'Strong founding team' }));
    if (s.recommendation === 'strong_buy' || s.recommendation === 'buy') push(t('ai.reasoning.derived.recommended', { defaultValue: 'AI-recommended investment' }));
    if (s.fundingRequest && s.fundingRequest > 0) push(t('ai.reasoning.derived.funding', { defaultValue: 'Clear, fundable ask' }));
  }

  return reasons.slice(0, 4);
};

const deriveBadges = (s: StartupWidgetData, t: CardTranslate): CardBadge[] => {
  const badges: CardBadge[] = [];
  const score = s.score ?? 0;

  if (s.recommendation === 'strong_buy' || score >= 85) {
    badges.push({ icon: '⭐', label: t('ai.badges.topPick', { defaultValue: 'Top Pick' }), tone: 'gold' });
  } else if (score >= 70) {
    badges.push({ icon: '💎', label: t('ai.badges.hiddenGem', { defaultValue: 'Hidden Gem' }), tone: 'blue' });
  }
  if (s.revenue && s.revenue > 0) {
    badges.push({ icon: '💰', label: t('ai.badges.revenue', { defaultValue: 'Revenue' }), tone: 'green' });
  }
  if (/\b(ai|ml|artificial|machine[\s-]?learning)\b|искусствен|нейросет|машинн/i.test(`${s.industry || ''} ${s.description || ''}`)) {
    badges.push({ icon: '🤖', label: t('ai.badges.aiStartup', { defaultValue: 'AI' }), tone: 'blue' });
  }

  return badges.slice(0, 3);
};

const compactUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
};

const formatMoney = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parsed = Number(trimmed.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) && parsed !== 0 ? compactUsd(parsed) : (trimmed || '—');
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return compactUsd(value);
};

const AIAssistant = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { organization, manager } = useAuth();
  const { isCollapsed } = useOutletContext<{ isCollapsed: boolean }>();
  const sidebarWidth = isCollapsed ? 80 : 260;

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startPrompts = [
    {
      icon: FileText,
      label: t('ai.suggestions.analyze'),
      prompt: t('ai.suggestions.analyze')
    },
    {
      icon: TrendingUp,
      label: t('ai.suggestions.compare'),
      prompt: t('ai.suggestions.compare')
    },
    {
      icon: ClipboardList,
      label: t('ai.suggestions.recommend'),
      prompt: t('ai.suggestions.recommend')
    },
    {
      icon: Users,
      label: t('ai.suggestions.market'),
      prompt: t('ai.suggestions.market')
    },
  ];
  const [searchParams] = useSearchParams();
  const chatIdFromUrl = searchParams.get('chat');

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    const loadChats = async () => {
      if (!manager?.id) {
        setIsLoadingChats(false);
        return;
      }

      try {
        if (chatIdFromUrl) {
          const response = await aiChatApi.getById(chatIdFromUrl);
          if (response.success && response.data) {
            const chat = response.data;
            const thread: Thread = {
              id: chat.id,
              firebaseId: chat.id,
              title: chat.title,
              preview: chat.preview,
              timestamp: new Date(chat.updatedAt),
              messages: chat.messages.map((msg: AIChatMessage) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                startupWidget: msg.startupWidget,
                startupsList: msg.startupsList,
                artifact: msg.artifact,
              })),
            };
            setThreads([thread]);
            setActiveThreadId(thread.id);
          }
        } else {
          const response = await aiChatApi.getAll(manager.id, organization?.id);
          if (response.success && response.data) {
            const loadedThreads: Thread[] = response.data.map((chat: AIChatThread) => ({
              id: chat.id,
              firebaseId: chat.id,
              title: chat.title,
              preview: chat.preview,
              timestamp: new Date(chat.updatedAt),
              messages: chat.messages.map((msg: AIChatMessage) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                startupWidget: msg.startupWidget,
                startupsList: msg.startupsList,
                artifact: msg.artifact,
              })),
            }));
            setThreads((prev) => {
              const localThreads = prev.filter((t) => !t.firebaseId);
              const mergedIds = new Set(loadedThreads.map((t) => t.id));
              return [...localThreads.filter((t) => !mergedIds.has(t.id)), ...loadedThreads];
            });
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingChats(false);
        hasLoadedRef.current = true;
      }
    };

    loadChats();
  }, [manager?.id, organization?.id, chatIdFromUrl]);

  const saveThreadToFirebase = useCallback(async (thread: Thread) => {
    if (!manager?.id) return;

    const messagesForApi: AIChatMessage[] = thread.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      startupWidget: msg.startupWidget,
      startupsList: msg.startupsList,
      artifact: msg.artifact,
    }));

    try {
      if (thread.firebaseId) {
        await aiChatApi.update(thread.firebaseId, {
          title: thread.title,
          messages: messagesForApi,
          preview: thread.preview,
        });
      } else {
        const response = await aiChatApi.create(
          manager.id,
          organization?.id,
          thread.title,
          messagesForApi
        );
        if (response.success && response.data) {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === thread.id ? { ...t, firebaseId: response.data!.id } : t
            )
          );
        }
      }
    } catch (error) {
      console.error('Failed to save chat to Firebase:', error);
    }
  }, [manager?.id, organization?.id]);


  const [showAttach, setShowAttach] = useState(false);
  const [isAttachClosing, setIsAttachClosing] = useState(false);

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToUserMessage = useCallback(() => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const userMessages = container.querySelectorAll('[data-user-message="true"]');
        const lastUserMessage = userMessages[userMessages.length - 1];

        if (lastUserMessage) {
          lastUserMessage.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    }, 50);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isTyping && !streamingMessageId) {
      scrollToBottom();
    }
  }, [isTyping, streamingMessageId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (showAttach &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(target) &&
        attachButtonRef.current &&
        !attachButtonRef.current.contains(target)) {
        closeAttachMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttach]);

  const closeAttachMenu = () => {
    setIsAttachClosing(true);
    setTimeout(() => {
      setShowAttach(false);
      setIsAttachClosing(false);
    }, 300);
  };

  const handleAttachToggle = () => {
    if (showAttach) {
      closeAttachMenu();
    } else {
      setShowAttach(true);
      setIsAttachClosing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFile = (file: File, type: 'image' | 'document'): string | null => {
    if (attachments.length >= MAX_TOTAL_ATTACHMENTS) {
      return t('ai.maxFiles');
    }

    if (type === 'image') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return t('ai.invalidFileType');
      }
      if (file.size > MAX_IMAGE_SIZE) {
        return t('ai.fileTooLarge');
      }
    } else {
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        return t('ai.invalidFileType');
      }
      if (file.size > MAX_DOCUMENT_SIZE) {
        return t('ai.fileTooLarge');
      }
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: AttachedFile[] = [];
    const currentCount = attachments.length;

    for (let i = 0; i < files.length && currentCount + newAttachments.length < MAX_TOTAL_ATTACHMENTS; i++) {
      const file = files[i];
      const error = validateFile(file, type);

      if (error) {
        alert(error);
        continue;
      }

      const attachment: AttachedFile = {
        id: `${Date.now()}-${i}`,
        file,
        type,
      };

      if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev =>
            prev.map(a =>
              a.id === attachment.id
                ? { ...a, preview: e.target?.result as string }
                : a
            )
          );
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);

    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleAttachItemClick = (type: 'image' | 'document') => {
    closeAttachMenu();
    if (type === 'image') {
      imageInputRef.current?.click();
    } else {
      documentInputRef.current?.click();
    }
  };

  const handleNewChat = () => {
    setActiveThreadId(null);
    setIsSidebarOpen(false);
    if (showAttach) closeAttachMenu();
  };

  const handleDeleteThread = async (threadId: string, firebaseId?: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));

    if (activeThreadId === threadId) {
      setActiveThreadId(null);
    }

    if (firebaseId) {
      try {
        await aiChatApi.delete(firebaseId);
      } catch (error) {
        console.error('Failed to delete chat from Firebase:', error);
      }
    }
  };

  const organizationRef = useRef(organization);
  const isMobileRef = useRef(isMobile);
  organizationRef.current = organization;
  isMobileRef.current = isMobile;

  const handleSendMessage = useCallback(async (content: string, files?: AttachedFile[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    const messageContent = content.trim() || t('ai.defaultImagePrompt');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent + (files && files.length > 0 ? `\n\n${t('ai.attachedFiles', { files: files.map(f => f.file.name).join(', ') })}` : ''),
      timestamp: new Date(),
    };

    let currentThreadId = activeThreadId;

    if (!currentThreadId) {
      const newThread: Thread = {
        id: Date.now().toString(),
        title: messageContent.slice(0, 40) + (messageContent.length > 40 ? '...' : ''),
        preview: messageContent,
        timestamp: new Date(),
        messages: [userMessage],
      };
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
      currentThreadId = newThread.id;
    } else {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: [...thread.messages, userMessage],
                timestamp: new Date(),
              }
            : thread
        )
      );
    }

    setInput('');
    setIsTyping(true);

    setTimeout(scrollToUserMessage, 50);

    const aiMessageId = (Date.now() + 1).toString();
    setStreamingMessageId(aiMessageId);

    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === currentThreadId
          ? {
              ...thread,
              messages: [...thread.messages, aiMessage],
            }
          : thread
      )
    );

    let imageData: { type: 'image'; data: string; mimeType: string }[] = [];
    let documentData: { type: 'document'; data: string; mimeType: string; fileName: string }[] = [];

    if (files && files.length > 0) {
      const imageFiles = files.filter(f => f.type === 'image');
      const documentFiles = files.filter(f => f.type === 'document');

      imageData = await Promise.all(
        imageFiles.map(async (f) => ({
          type: 'image' as const,
          data: await fileToBase64(f.file),
          mimeType: f.file.type || 'image/jpeg',
        }))
      );

      documentData = await Promise.all(
        documentFiles.map(async (f) => ({
          type: 'document' as const,
          data: await fileToBase64(f.file),
          mimeType: f.file.type || 'application/octet-stream',
          fileName: f.file.name,
        }))
      );
    }

    let history: AIMessage[] = [];
    setThreads((currentThreads) => {
      const activeThread = currentThreads.find((t) => t.id === currentThreadId);
      if (activeThread) {
        history = activeThread.messages
          .filter((m) => m.id !== aiMessageId) // exclude AI placeholder
          .map((m) => ({ role: m.role, content: m.content }));
      }
      return currentThreads; // no mutation
    });

    const currentMessage: AIMessage = {
      role: 'user',
      content: messageContent,
      images: imageData.length > 0 ? imageData : undefined,
      documents: documentData.length > 0 ? documentData : undefined,
    };
    history.push(currentMessage);

    try {
      const handleStreamEvent = (event: AIStreamEvent) => {
        switch (event.type) {
          case 'text':
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === currentThreadId
                  ? {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId
                          ? { ...m, content: m.content + (event.content || '') }
                          : m
                      ),
                    }
                  : thread
              )
            );
            break;

          case 'startup_widget':
            if (event.startup) {
              setThreads((prev) =>
                prev.map((thread) =>
                  thread.id === currentThreadId
                    ? {
                        ...thread,
                        messages: thread.messages.map((m) =>
                          m.id === aiMessageId
                            ? { ...m, startupWidget: event.startup }
                            : m
                        ),
                      }
                    : thread
                )
              );
            }
            break;

          case 'startups_list':
            if (event.startups && event.startups.length > 0) {
              setThreads((prev) =>
                prev.map((thread) =>
                  thread.id === currentThreadId
                    ? {
                        ...thread,
                        messages: thread.messages.map((m) =>
                          m.id === aiMessageId
                            ? { ...m, startupsList: event.startups }
                            : m
                        ),
                      }
                    : thread
                )
              );
            }
            break;

          case 'tool_start':
            setActiveTool(event.tool || null);
            break;

          case 'done':
            setThreads((prev) => {
              const updatedThreads = prev.map((thread) =>
                thread.id === currentThreadId
                  ? {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId
                          ? { ...m, isStreaming: false }
                          : m
                      ),
                      preview: thread.messages.find((m) => m.id === aiMessageId)?.content.slice(0, 50) + '...',
                    }
                  : thread
              );
              const threadToSave = updatedThreads.find((t) => t.id === currentThreadId);
              if (threadToSave) {
                saveThreadToFirebase(threadToSave);
              }
              return updatedThreads;
            });
            setActiveTool(null);
            setIsTyping(false);
            setStreamingMessageId(null);
            break;

          case 'error':
            setThreads((prev) =>
              prev.map((thread) =>
                thread.id === currentThreadId
                  ? {
                      ...thread,
                      messages: thread.messages.map((m) =>
                        m.id === aiMessageId
                          ? {
                              ...m,
                              content: m.content
                                ? `${m.content}\n\n⚠️ ${t('ai.errors.processing')}`
                                : t('ai.errors.processing'),
                              isStreaming: false,
                            }
                          : m
                      ),
                    }
                  : thread
              )
            );
            setActiveTool(null);
            setIsTyping(false);
            setStreamingMessageId(null);
            break;
        }
      };

      await aiApi.chatStream(history, handleStreamEvent, { organizationId: organizationRef.current?.id, isMobile: isMobileRef.current }, true);
    } catch (error) {
      console.error('AI API error:', error);
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        content: t('ai.errors.serviceUnavailable'),
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : thread
        )
      );
      setActiveTool(null);
      setIsTyping(false);
      setStreamingMessageId(null);
    }
  }, [activeThreadId, saveThreadToFirebase, t]);


  const handlePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSendMessage(input, attachments.length > 0 ? attachments : undefined);
        setAttachments([]);
      }
    }
  };

  return (
    <Container $sidebarWidth={sidebarWidth}>
      <SidebarOverlay $isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(false)} />

      <HistorySidebar $isOpen={isSidebarOpen}>
        <SidebarHeader>
          <SidebarTitle>
            {t('ai.title')}
          </SidebarTitle>
          <CloseButton onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </CloseButton>
        </SidebarHeader>

        <NewChatButton onClick={handleNewChat}>
          <Plus size={16} />
          {t('ai.newChat')}
        </NewChatButton>

        <ThreadsList>
          {isLoadingChats ? (
            <ThreadsLoading>
              <Loader2 size={16} />
              {t('common.loading')}
            </ThreadsLoading>
          ) : threads.length === 0 ? (
            <EmptyThreads>
              {t('ai.history.empty')}
            </EmptyThreads>
          ) : (
            threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                $active={thread.id === activeThreadId}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  setIsSidebarOpen(false);
                }}
              >
                <ThreadTitle>{thread.title}</ThreadTitle>
                <ThreadPreview>{thread.preview}</ThreadPreview>
                <ThreadDeleteButton
                  className="thread-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteThread(thread.id, thread.firebaseId);
                  }}
                  title={t('ai.history.deleteChat')}
                >
                  <Trash2 />
                </ThreadDeleteButton>
              </ThreadItem>
            ))
          )}
        </ThreadsList>
      </HistorySidebar>

      <MainArea>
        <TopRightButtons>
          <ToggleButton onClick={() => setIsSidebarOpen(true)} title={t('ai.history.open')}>
            <PanelRight />
          </ToggleButton>
        </TopRightButtons>
        <MessagesContainer
          ref={messagesContainerRef}
          $hasMessages={!!(activeThread && activeThread.messages.length > 0)}
        >
          {!activeThread || activeThread.messages.length === 0 ? (
            <StartScreen>
              <StartTitle>{t('ai.welcome.title')}</StartTitle>
              <StartSubtitle>
                {t('ai.welcome.description')}
              </StartSubtitle>
              <PromptsGrid>
                {startPrompts.map((prompt, index) => (
                  <PromptCard
                    key={index}
                    onClick={() => handlePromptClick(prompt.prompt)}
                  >
                    <prompt.icon />
                    <PromptLabel>{prompt.label}</PromptLabel>
                  </PromptCard>
                ))}
              </PromptsGrid>
            </StartScreen>
          ) : (
            <MessagesArea $hasMessages={activeThread.messages.length > 0}>
              {activeThread.messages.map((message) => (
                <MessageGroup
                  key={message.id}
                  $isUser={message.role === 'user'}
                  data-user-message={message.role === 'user' ? 'true' : undefined}
                >
                  <MessageContent $isUser={message.role === 'user'}>
                    {message.role === 'assistant' ? (
                      <>
                        <MarkdownText text={message.content} />
                        {message.artifact && (
                          <AIArtifact artifact={message.artifact} isLoading={false} />
                        )}
                        {message.isStreaming && <StreamingText />}
                      </>
                    ) : (
                      <MessageText>{message.content}</MessageText>
                    )}
                    {message.role === 'assistant' && activeTool && message.id === streamingMessageId && (
                      <ToolLoadingIndicator>
                        <Loader2 size={18} />
                        {t(`ai.tools.${activeTool}`, { defaultValue: t('ai.thinking') })}
                      </ToolLoadingIndicator>
                    )}
                    {message.role === 'assistant' && message.startupWidget && (
                      <StartupWidgetCard onClick={() => navigate(`/startups/${message.startupWidget!.id}`)}>
                        <WidgetHeader>
                          <WidgetLogo>
                            <StartupLogo
                              src={message.startupWidget.logo}
                              startupId={message.startupWidget.id}
                              name={message.startupWidget.companyName || ''}
                              variant="hero"
                            />
                          </WidgetLogo>
                          <WidgetInfo>
                            <WidgetName>{message.startupWidget.companyName}</WidgetName>
                            <WidgetIndustry>{message.startupWidget.industry}</WidgetIndustry>
                            <WidgetBadges>
                              {message.startupWidget.stage && (
                                <WidgetBadge $variant="success">{message.startupWidget.stage}</WidgetBadge>
                              )}
                              <WidgetBadge $variant={
                                message.startupWidget.status === 'portfolio' ? 'success' :
                                message.startupWidget.status === 'pipeline' ? 'info' :
                                message.startupWidget.status === 'in_review' ? 'warning' :
                                message.startupWidget.status === 'rejected' ? 'danger' : 'neutral'
                              }>
                                {t(`ai.status.${message.startupWidget.status}`, { defaultValue: message.startupWidget.status })}
                              </WidgetBadge>
                              {message.startupWidget.source && (
                                <WidgetBadge $variant="neutral">{message.startupWidget.source}</WidgetBadge>
                              )}
                            </WidgetBadges>
                          </WidgetInfo>
                        </WidgetHeader>

                        {message.startupWidget.status === 'portfolio' && message.startupWidget.investmentAmount && (
                          <WidgetInvestmentCard>
                            <div>
                              <InvestmentLabel>{t('ai.widget.fundInvestment')}</InvestmentLabel>
                              <InvestmentValue>
                                ${message.startupWidget.investmentAmount.toLocaleString(numberLocale(i18n.language))}
                              </InvestmentValue>
                            </div>
                            <InvestmentBadge>{t('ai.widget.inPortfolio')}</InvestmentBadge>
                          </WidgetInvestmentCard>
                        )}

                        {message.startupWidget.status !== 'new' && message.startupWidget.assignedManager && (
                          <WidgetManagerSection>
                            <WidgetManagerLabel>{t('common.manager')}:</WidgetManagerLabel>
                            <WidgetManagerInfo>
                              <WidgetManagerAvatar>
                                {message.startupWidget.assignedManager.avatar ? (
                                  <CrmImage src={message.startupWidget.assignedManager.avatar} alt={message.startupWidget.assignedManager.name} />
                                ) : (
                                  <User />
                                )}
                              </WidgetManagerAvatar>
                              <WidgetManagerName>{message.startupWidget.assignedManager.name}</WidgetManagerName>
                            </WidgetManagerInfo>
                          </WidgetManagerSection>
                        )}

                        {message.startupWidget.description && (
                          <WidgetDescription>{message.startupWidget.description}</WidgetDescription>
                        )}

                        <WidgetMeta>
                          {message.startupWidget.score && (
                            <WidgetMetaItem>
                              <WidgetMetaLabel>{t('ai.widget.score', { defaultValue: 'Score' })}</WidgetMetaLabel>
                              <WidgetScore $score={message.startupWidget.score}>
                                {message.startupWidget.score}
                              </WidgetScore>
                            </WidgetMetaItem>
                          )}
                          {message.startupWidget.valuation && (
                            <WidgetMetaItem>
                              <WidgetMetaLabel>{t('ai.widget.valuation')}</WidgetMetaLabel>
                              <WidgetMetaValue>
                                {formatMoney(message.startupWidget.valuation)}
                              </WidgetMetaValue>
                            </WidgetMetaItem>
                          )}
                          {message.startupWidget.fundingRequest && (
                            <WidgetMetaItem>
                              <WidgetMetaLabel>{t('ai.widget.fundingRequest')}</WidgetMetaLabel>
                              <WidgetMetaValue>
                                {formatMoney(message.startupWidget.fundingRequest)}
                              </WidgetMetaValue>
                            </WidgetMetaItem>
                          )}
                          {message.startupWidget.revenue && (
                            <WidgetMetaItem>
                              <WidgetMetaLabel>{t('ai.widget.revenue')}</WidgetMetaLabel>
                              <WidgetMetaValue>
                                {formatMoney(message.startupWidget.revenue)}
                              </WidgetMetaValue>
                            </WidgetMetaItem>
                          )}
                        </WidgetMeta>

                        {(message.startupWidget.strengths && message.startupWidget.strengths.length > 0) ||
                         (message.startupWidget.weaknesses && message.startupWidget.weaknesses.length > 0) ? (
                          <WidgetAISection>
                            {message.startupWidget.strengths && message.startupWidget.strengths.length > 0 && (
                              <>
                                <WidgetAITitle>{t('ai.widget.strengths')}</WidgetAITitle>
                                <WidgetAIList>
                                  {message.startupWidget.strengths.slice(0, 2).map((s, i) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </WidgetAIList>
                              </>
                            )}
                            {message.startupWidget.weaknesses && message.startupWidget.weaknesses.length > 0 && (
                              <>
                                <WidgetAITitle style={{ marginTop: '8px' }}>{t('ai.widget.risks')}</WidgetAITitle>
                                <WidgetAIList>
                                  {message.startupWidget.weaknesses.slice(0, 2).map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </WidgetAIList>
                              </>
                            )}
                            {message.startupWidget.recommendation && (
                              <WidgetRecommendation $rec={message.startupWidget.recommendation}>
                                {t(`ai.recommendations.${message.startupWidget.recommendation}`, { defaultValue: message.startupWidget.recommendation })}
                              </WidgetRecommendation>
                            )}
                          </WidgetAISection>
                        ) : null}
                      </StartupWidgetCard>
                    )}
                    {message.role === 'assistant' && message.startupsList && message.startupsList.length > 0 && (
                      <StartupsListContainer>
                        {message.startupsList.map((startup) => {
                          const reasons = deriveAiReasons(startup, t);
                          const badges = deriveBadges(startup, t);
                          const hasScore = typeof startup.score === 'number' && startup.score > 0;
                          return (
                          <StartupListCard key={startup.id}>
                            {(hasScore || badges.length > 0) ? (
                              <ListCardTopRow>
                                {hasScore ? (
                                  <ListCardScoreBadge title={t('ai.reasoning.scoreHint', { defaultValue: 'AI investment score derived from team, traction, market and unit economics' })}>
                                    <Star />
                                    <span className="label">{t('ai.widget.aiScore', { defaultValue: 'AI Score' })}</span>
                                    <span className="value">{startup.score}</span>
                                  </ListCardScoreBadge>
                                ) : null}
                                <ListCardBadgeRow>
                                  {badges.map((b, i) => (
                                    <ListCardBadge key={i} $tone={b.tone}>
                                      <span>{b.icon}</span>{b.label}
                                    </ListCardBadge>
                                  ))}
                                </ListCardBadgeRow>
                              </ListCardTopRow>
                            ) : null}

                            <ListCardHeader>
                              <StartupLogo
                                src={startup.logo}
                                startupId={startup.id}
                                name={startup.companyName || ''}
                                variant="sm"
                              />
                              <ListCardInfo>
                                <ListCardName>
                                  {startup.companyName}
                                </ListCardName>
                                <ListCardIndustry>
                                  {startup.industry}
                                  {startup.stage && <ListCardStageTag>{startup.stage}</ListCardStageTag>}
                                </ListCardIndustry>
                              </ListCardInfo>
                              <ListCardStatus $status={startup.status}>
                                {t(`ai.status.${startup.status}`, { defaultValue: startup.status })}
                              </ListCardStatus>
                            </ListCardHeader>

                            {hasScore ? (
                              <ListCardScoreSection>
                                <ListCardProgressBar>
                                  <ListCardProgressFill $score={startup.score!} />
                                </ListCardProgressBar>
                              </ListCardScoreSection>
                            ) : null}

                            {reasons.length > 0 && (
                              <ReasoningBlock>
                                <ReasoningTitle>
                                  <BrainCircuit />
                                  {t('ai.reasoning.title', { defaultValue: 'Why AI selected this' })}
                                </ReasoningTitle>
                                <ReasoningList>
                                  {reasons.map((reason, i) => (
                                    <ReasoningItem key={i}>
                                      <Check />
                                      <span>{reason}</span>
                                    </ReasoningItem>
                                  ))}
                                </ReasoningList>
                              </ReasoningBlock>
                            )}

                            {(startup.fundingRequest || startup.revenue || startup.valuation || startup.teamSize) && (
                              <MetricChipsRow>
                                {!!startup.fundingRequest && (
                                  <MetricChip title={t('ai.widget.fundingRequest', { defaultValue: 'Funding' })}>
                                    <DollarSign />
                                    {formatMoney(startup.fundingRequest)}
                                  </MetricChip>
                                )}
                                {!!startup.revenue && (
                                  <MetricChip title={t('ai.widget.revenue', { defaultValue: 'Revenue' })}>
                                    <TrendingUp />
                                    {formatMoney(startup.revenue)}
                                  </MetricChip>
                                )}
                                {!!startup.valuation && (
                                  <MetricChip title={t('ai.widget.valuation', { defaultValue: 'Valuation' })}>
                                    <CircleDollarSign />
                                    {formatMoney(startup.valuation)}
                                  </MetricChip>
                                )}
                                {!!startup.teamSize && (
                                  <MetricChip title={t('ai.widget.teamSize', { defaultValue: 'Team' })}>
                                    <Users />
                                    {startup.teamSize}
                                  </MetricChip>
                                )}
                              </MetricChipsRow>
                            )}

                            {startup.assignedManager && (
                              <ListCardManagerRow>
                                <ListCardManagerAvatar>
                                  {startup.assignedManager.avatar ? (
                                    <CrmImage src={startup.assignedManager.avatar} alt={startup.assignedManager.name} />
                                  ) : (
                                    <User />
                                  )}
                                </ListCardManagerAvatar>
                                <ListCardManagerName>{startup.assignedManager.name}</ListCardManagerName>
                              </ListCardManagerRow>
                            )}

                            <ListCardActionButton onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/startups/${startup.id}`);
                            }}>
                              {t('ai.widget.openStartup', { defaultValue: t('common.open') })}
                              <ChevronRight />
                            </ListCardActionButton>
                          </StartupListCard>
                          );
                        })}
                      </StartupsListContainer>
                    )}
                    {message.role === 'assistant' && !message.isStreaming && (
                      <MessageActions>
                        <ActionButton title={t('common.copy')} onClick={() => navigator.clipboard.writeText(message.content)}>
                          <Copy />
                        </ActionButton>
                        <ActionButton title={t('ai.actions.share')} onClick={() => {
                          if (navigator.share) {
                            navigator.share({ text: message.content }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(message.content);
                          }
                        }}>
                          <Share2 />
                        </ActionButton>
                      </MessageActions>
                    )}
                  </MessageContent>
                </MessageGroup>
              ))}
              {isTyping && !streamingMessageId && (
                <MessageGroup $isUser={false}>
                  <MessageContent $isUser={false}>
                    <TypingIndicator>
                      <span />
                      <span />
                      <span />
                    </TypingIndicator>
                  </MessageContent>
                </MessageGroup>
              )}
              <div ref={messagesEndRef} />
            </MessagesArea>
          )}
        </MessagesContainer>

        <ComposerWrapper>
          <ComposerContainer>
            {attachments.length > 0 && (
              <AttachmentsPreview>
                {attachments.map(attachment => (
                  <AttachmentItem key={attachment.id}>
                    {attachment.type === 'image' && attachment.preview ? (
                      <AttachmentImagePreview src={attachment.preview} alt={attachment.file.name} />
                    ) : (
                      <AttachmentIcon>
                        <FileUp size={16} />
                      </AttachmentIcon>
                    )}
                    <AttachmentInfo>
                      <AttachmentName>{attachment.file.name}</AttachmentName>
                      <AttachmentSize>{formatFileSize(attachment.file.size)}</AttachmentSize>
                    </AttachmentInfo>
                    <RemoveAttachmentButton onClick={() => removeAttachment(attachment.id)}>
                      <X />
                    </RemoveAttachmentButton>
                  </AttachmentItem>
                ))}
              </AttachmentsPreview>
            )}
            <ComposerInner>
              <HiddenFileInput
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                multiple
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <HiddenFileInput
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                multiple
                onChange={(e) => handleFileSelect(e, 'document')}
              />

              {(showAttach || isAttachClosing) && (
                <AttachMenu ref={attachMenuRef} $isClosing={isAttachClosing}>
                  <ToolItem onClick={() => handleAttachItemClick('image')}>
                    <ImageIcon />
                    <span>{t('ai.attachImage')}</span>
                  </ToolItem>
                  <ToolItem onClick={() => handleAttachItemClick('document')}>
                    <FileUp />
                    <span>{t('ai.attachDocument')}</span>
                  </ToolItem>
                </AttachMenu>
              )}

              <AttachButton
                ref={attachButtonRef}
                title={t('ai.attachFile')}
                onClick={handleAttachToggle}
                $active={showAttach}
              >
                <Paperclip />
              </AttachButton>

              <ComposerTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(isMobile ? 'ai.placeholderShort' : 'ai.placeholder')}
                rows={1}
              />

              <SendButton
                $disabled={!input.trim()}
                onClick={() => {
                  handleSendMessage(input, attachments.length > 0 ? attachments : undefined);
                  setAttachments([]);
                }}
                disabled={!input.trim()}
              >
                <Send />
              </SendButton>
            </ComposerInner>
          </ComposerContainer>
        </ComposerWrapper>
      </MainArea>
    </Container>
  );
};

export default AIAssistant;
