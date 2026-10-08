import { useTranslation } from 'react-i18next';
import { LegalDocument } from '../../components/LegalDocument';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  return <LegalDocument kind="privacy" subtitle={t('LEGAL')} />;
}
