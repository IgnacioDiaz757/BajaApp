import { useTranslation } from 'react-i18next';
import { LegalDocument } from '../../components/LegalDocument';

export default function TermsScreen() {
  const { t } = useTranslation();
  return <LegalDocument kind="terms" subtitle={t('LEGAL')} />;
}
