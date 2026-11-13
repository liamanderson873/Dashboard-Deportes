import { PersonalPage } from '@/components/PersonalPage';
export const dynamic='force-dynamic';
export const metadata={title:'Mi once ideal'};
export default function Page({params}:{params:Promise<{competition:string;season:string}>}){return <PersonalPage params={params} surface="lineup"/>;}
