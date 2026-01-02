import AdminMatches from './pages/AdminMatches';
import CreateFund from './pages/CreateFund';
import FAQ from './pages/FAQ';
import FundDetails from './pages/FundDetails';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminMatches": AdminMatches,
    "CreateFund": CreateFund,
    "FAQ": FAQ,
    "FundDetails": FundDetails,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};