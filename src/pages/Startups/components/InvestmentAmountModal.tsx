import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X, TrendingUp, DollarSign, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { numberLocale } from '../../../utils/formatNumber';

export type ValuationType = 'pre-money' | 'post-money';
export type PortfolioType = 'investment' | 'program';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    color: #10b981;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
`;

const Description = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 20px;
  line-height: 1.5;
`;

const StartupName = styled.span`
  color: #fff;
  font-weight: 600;
`;

const InputWrapper = styled.div`
  position: relative;
  margin-bottom: 20px;
`;

const InputIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #10b981;
  font-size: 18px;
  font-weight: 700;
`;

const Input = styled.input`
  width: 100%;
  padding: 16px 16px 16px 40px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  outline: none;
  transition: all 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
    font-weight: 400;
  }

  &:focus {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }
`;

const QuickAmounts = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const QuickAmount = styled.button`
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.3);
    color: #10b981;
  }
`;

const ValuationTypeSection = styled.div`
  margin-bottom: 20px;
`;

const ValuationTypeLabel = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 10px;
`;

const ValuationTypeToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ValuationTypeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $active }) => $active ? '#10b981' : 'transparent'};
  color: ${({ $active }) => $active ? 'white' : 'rgba(255, 255, 255, 0.6)'};

  &:hover {
    color: ${({ $active }) => $active ? 'white' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const ValuationTypeDescription = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 8px;
  line-height: 1.4;
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #10b981;
    cursor: pointer;
  }
`;

const CheckboxLabel = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CheckboxSubLabel = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
`;

const Footer = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  ${({ $primary }) => $primary ? `
    background: #10b981;
    color: white;

    &:hover {
      background: #059669;
    }

    &:disabled {
      background: rgba(16, 185, 129, 0.3);
      cursor: not-allowed;
    }
  ` : `
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
  `}
`;

interface InvestmentAmountModalProps {
  isOpen: boolean;
  startupName: string;
  onConfirm: (amount: number, valuationType: ValuationType, valuation?: number, isCoInvestment?: boolean, portfolioType?: PortfolioType) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultPortfolioType?: PortfolioType;
}

export const InvestmentAmountModal = ({ isOpen, startupName, onConfirm, onCancel, isLoading, defaultPortfolioType }: InvestmentAmountModalProps) => {
  const { t } = useTranslation();
  const [portfolioType, setPortfolioType] = useState<PortfolioType>(defaultPortfolioType ?? 'investment');

  useEffect(() => {
    if (isOpen && defaultPortfolioType) {
      setPortfolioType(defaultPortfolioType);
    }
  }, [isOpen, defaultPortfolioType]);
  const [amount, setAmount] = useState<string>('');
  const [valuation, setValuation] = useState<string>('');
  const [valuationType, setValuationType] = useState<ValuationType>('pre-money');
  const [isCoInvestment, setIsCoInvestment] = useState(false);

  const isProgram = portfolioType === 'program';

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleValuationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setValuation(value);
  };

  const handleConfirm = () => {
    if (isProgram) {
      onConfirm(0, valuationType, undefined, false, 'program');
      return;
    }
    const numAmount = parseFloat(amount);
    if (numAmount > 0) {
      const numValuation = valuation ? parseFloat(valuation) : undefined;
      onConfirm(numAmount, valuationType, numValuation, isCoInvestment, 'investment');
    }
  };

  const formatDisplay = (value: string) => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    const parts = value.split('.');
    const intPart = Math.floor(num).toLocaleString(numberLocale());
    return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
  };

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={onCancel}>
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <Title>
            <TrendingUp size={20} />
            {t('startups.investment.addToPortfolio')}
          </Title>
          <CloseButton onClick={onCancel}>
            <X size={20} />
          </CloseButton>
        </Header>

        <Description>
          {t('startups.investment.enterAmountFor')} <StartupName>{startupName}</StartupName>
        </Description>

        <ValuationTypeSection>
          <ValuationTypeLabel>{t('startups.investment.portfolioType')}</ValuationTypeLabel>
          <ValuationTypeToggle>
            <ValuationTypeButton $active={!isProgram} onClick={() => setPortfolioType('investment')}>
              <DollarSign size={14} /> {t('startups.investment.withInvestment')}
            </ValuationTypeButton>
            <ValuationTypeButton $active={isProgram} onClick={() => setPortfolioType('program')}>
              <Handshake size={14} /> {t('startups.investment.programType')}
            </ValuationTypeButton>
          </ValuationTypeToggle>
          <ValuationTypeDescription>
            {isProgram
              ? t('startups.investment.programDesc')
              : t('startups.investment.investmentDesc')}
          </ValuationTypeDescription>
        </ValuationTypeSection>

        {!isProgram && (
          <>
            <InputWrapper>
              <InputIcon>$</InputIcon>
              <Input
                type="text"
                placeholder="0"
                value={formatDisplay(amount)}
                onChange={handleAmountChange}
                autoFocus
              />
            </InputWrapper>

            <QuickAmounts>
              <QuickAmount onClick={() => handleQuickAmount(50000)}>$50K</QuickAmount>
              <QuickAmount onClick={() => handleQuickAmount(100000)}>$100K</QuickAmount>
              <QuickAmount onClick={() => handleQuickAmount(250000)}>$250K</QuickAmount>
              <QuickAmount onClick={() => handleQuickAmount(500000)}>$500K</QuickAmount>
            </QuickAmounts>

            <ValuationTypeSection>
              <ValuationTypeLabel>{t('startups.investment.valuationType', 'Тип оценки')}</ValuationTypeLabel>
              <ValuationTypeToggle>
                <ValuationTypeButton $active={valuationType === 'pre-money'} onClick={() => setValuationType('pre-money')}>
                  Pre-money
                </ValuationTypeButton>
                <ValuationTypeButton $active={valuationType === 'post-money'} onClick={() => setValuationType('post-money')}>
                  Post-money
                </ValuationTypeButton>
              </ValuationTypeToggle>
              <ValuationTypeDescription>
                {valuationType === 'pre-money'
                  ? t('startups.investment.preMoneyDesc', 'Оценка компании до инвестиций')
                  : t('startups.investment.postMoneyDesc', 'Оценка компании после инвестиций')}
              </ValuationTypeDescription>
            </ValuationTypeSection>

            <ValuationTypeLabel>{t('startups.investment.valuation', 'Оценка компании ($)')}</ValuationTypeLabel>
            <InputWrapper>
              <InputIcon>$</InputIcon>
              <Input
                type="text"
                placeholder="0"
                value={formatDisplay(valuation)}
                onChange={handleValuationChange}
              />
            </InputWrapper>

            <CheckboxRow>
              <input type="checkbox" checked={isCoInvestment} onChange={e => setIsCoInvestment(e.target.checked)} />
              <CheckboxLabel>
                {t('startups.investment.coInvestment', '1+1 Co-Investment')}
                <CheckboxSubLabel>{t('startups.investment.coInvestmentDesc', 'Совместная инвестиция с партнёром')}</CheckboxSubLabel>
              </CheckboxLabel>
            </CheckboxRow>
          </>
        )}

        <Footer>
          <Button onClick={onCancel} disabled={isLoading}>{t('common.cancel')}</Button>
          <Button
            $primary
            onClick={handleConfirm}
            disabled={(!isProgram && (!amount || parseFloat(amount) <= 0)) || isLoading}
          >
            {isLoading ? t('startups.investment.saving') : t('startups.investment.confirm')}
          </Button>
        </Footer>
      </Modal>
    </Overlay>,
    document.body
  );
};
