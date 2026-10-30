import {LanguageSwitcher} from './LocaleProvider';
import {AppearanceSwitch} from './AppearanceSwitch';

export function SiteTools() {
  return <div className="site-tools"><AppearanceSwitch/><LanguageSwitcher/></div>;
}
