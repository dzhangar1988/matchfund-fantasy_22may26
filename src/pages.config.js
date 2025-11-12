import Home from './pages/Home';
import CreateFund from './pages/CreateFund';
import FundDetails from './pages/FundDetails';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import AdminMatches from './pages/AdminMatches';
import FAQ from './pages/FAQ';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "CreateFund": CreateFund,
    "FundDetails": FundDetails,
    "Profile": Profile,
    "Leaderboard": Leaderboard,
    "AdminMatches": AdminMatches,
    "FAQ": FAQ,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};