import { Button } from "ui";

import docStyles from '@styles/app.module.scss';

export default function Docs() {
  return (
    <div>
      <h1 className={docStyles['docs-title']}>Docs</h1>
      <Button />
    </div>
  );
}
