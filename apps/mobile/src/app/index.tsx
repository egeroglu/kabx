import { Redirect } from 'expo-router';

// Demo her açılışta onboarding'den başlar. Profil sekmesinden de tekrar izlenebilir.
export default function Index() {
  return <Redirect href="/onboarding/quiz" />;
}
