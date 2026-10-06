import Layout from '../../components/Layout';
import GuideView from '../../components/GuideView';
import { proGuide } from '../../lib/guide-pro';

export default function GuiaProfissional() {
  return (
    <Layout title="Guia de uso">
      <GuideView guide={proGuide} />
    </Layout>
  );
}
