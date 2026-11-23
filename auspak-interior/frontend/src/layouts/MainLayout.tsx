import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ScrollManager from '../components/layout/ScrollManager';

export default function MainLayout() {
  return (
    <>
      <ScrollManager />
      <Header />
      <main className="pt-20 min-h-screen"><Outlet /></main>
      <Footer />
    </>
  );
}
