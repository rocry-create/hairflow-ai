import Layout from '../components/Layout';
import GuideView from '../components/GuideView';
import { adminGuide } from '../lib/guide-admin';

export default function Guia() {
  return (
    <Layout title="Guia de uso">
      <GuideView guide={adminGuide} />
    </Layout>
  );
}
