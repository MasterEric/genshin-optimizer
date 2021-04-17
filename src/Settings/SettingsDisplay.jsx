import { useCallback, useState } from "react"
import { Alert, Button, Card, Col, Container, Form, Row } from "react-bootstrap"
import ReactGA from 'react-ga'
import { Trans } from "react-i18next";
import { useTranslation } from 'react-i18next';
import ArtifactDatabase from "../Database/ArtifactDatabase"
import CharacterDatabase from "../Database/CharacterDatabase"
import { clearDatabase, createDatabaseObj, DatabaseInitAndVerify, loadDatabaseObj } from "../Database/DatabaseUtil"

DatabaseInitAndVerify()
export default function SettingsDisplay() {
  const [, updateState] = useState()
  const forceUpdate = useCallback(() => updateState({}), []);
  const { i18n } = useTranslation(["ui", "settings"], { useSuspense: false });
  ReactGA.pageview('/setting')

  const onSetLanguage = (lang) => () => {
    i18n.changeLanguage(lang);
  }

  return <Container>
    <Card bg="darkcontent" text="lightfont" className="mt-2">
      <Card.Header><Trans i18nKey="settings:ui-settings" /></Card.Header>
      <Card.Body>
        {/* TODO: Make this a dropdown. */}
        <Row>
          <Col xs="auto"><Button onClick={onSetLanguage('en')}><Trans i18nKey="languages:en" /></Button></Col>
          <Col xs="auto"><Button onClick={onSetLanguage('fr')}><Trans i18nKey="languages:fr" /></Button></Col>
        </Row>
      </Card.Body>
    </Card>
    <Card bg="darkcontent" text="lightfont" className="mt-2">
      <Card.Header><Trans i18nKey="settings:database-management" /></Card.Header>
      <Card.Body>
        <DownloadCard forceUpdate={forceUpdate} />
        <UploadCard forceUpdate={forceUpdate} />
      </Card.Body>
    </Card>
  </Container>
}
function download(JSONstr, filename = "data.json") {
  const contentType = "application/json;charset=utf-8"
  if (window?.navigator?.msSaveOrOpenBlob) {
    const blob = new Blob([decodeURIComponent(encodeURI(JSONstr))], { type: contentType })
    navigator.msSaveOrOpenBlob(blob, filename)
  } else {
    const a = document.createElement('a');
    a.download = filename
    a.href = `data:${contentType},${encodeURIComponent(JSONstr)}`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

function deleteDatabase(t) {
  if (!window.confirm(t("settings:dialog.delete-database"))) return
  clearDatabase()
}
function copyToClipboard() {
  navigator.clipboard.writeText(JSON.stringify(createDatabaseObj()))
  alert("Copied database to clipboard.")
}
function DownloadCard({ forceUpdate }) {
  const numChar = CharacterDatabase.getIdList().length
  const numArt = ArtifactDatabase.getIdList().length
  const downloadValid = Boolean(numChar || numArt)
  const { t } = useTranslation("settings", { useSuspense: false });
  const deleteDB = () => {
    deleteDatabase(t);
    forceUpdate()
  }
  return <Card bg="lightcontent" text="lightfont" className="mb-3">
    <Card.Header><Trans i18nKey="settings:database-download" /></Card.Header>
    <Card.Body>
      <Row className="mb-2">
        {/* Translations including nested tags like <strong> or <b> are a pain, since they require a different component. */}
        <Col xs={12} md={6}><h6><Trans i18nKey="settings:chars-stored" count={numChar}><b>{{ count: numChar }}</b> Characters Stored</Trans></h6></Col>
        <Col xs={12} md={6}><h6><Trans i18nKey="settings:artis-stored" count={numArt}><b>{{ count: numArt }}</b> Artifacts Stored</Trans></h6></Col>
      </Row>
      <small><Trans i18nKey="settings:database-disclaimer" /></small>
    </Card.Body>
    <Card.Footer>
      <Row>
        <Col xs="auto"><Button disabled={!downloadValid} onClick={() => download(JSON.stringify(createDatabaseObj()))}><Trans i18nKey="settings:button.download" /></Button></Col>
        <Col ><Button disabled={!downloadValid} variant="info" onClick={copyToClipboard}><Trans i18nKey="settings:button.copy-to-clipboard" /></Button></Col>
        <Col xs="auto"><Button disabled={!downloadValid} variant="danger" onClick={deleteDB} ><Trans i18nKey="settings:button.delete-database" /></Button></Col>
      </Row>
    </Card.Footer>
  </Card>
}
async function readFile(file, cb) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    cb(reader.result)
  }
  reader.readAsText(file)
}
function replaceDatabase(obj, cb = () => { }) {
  if (!window.confirm("Are you sure you want to replace your database? All existing characters and artifacts will be deleted before replacement.")) return
  loadDatabaseObj(obj)
  cb()
}
function UploadCard({ forceUpdate }) {
  const [data, setdata] = useState("")
  const [filename, setfilename] = useState("")
  const { t } = useTranslation("settings", { useSuspense: false });
  let error = ""
  let numChar, numArt, dataObj
  if (data) {
    try {
      dataObj = JSON.parse(data)
      const { characterDatabase, artifactDatabase } = dataObj
      numChar = Object.keys(characterDatabase).length
      numArt = Object.keys(artifactDatabase).length
    } catch (e) {
      error = `Invalid JSON: ${e}`
    }
  }
  const dataValid = Boolean(numChar || numArt)
  const replaceDB = () => {
    replaceDatabase(dataObj)
    setdata("")
    setfilename("")
    forceUpdate()
  }
  const onUpload = e => {
    const file = e.target.files[0]
    e.target.value = null//reset the value so the same file can be uploaded again...
    if (file) setfilename(file.name)
    readFile(file, setdata)
  }
  return <Card bg="lightcontent" text="lightfont">
    <Card.Header><Trans i18nKey="settings:database-upload" /></Card.Header>
    <Card.Body>
      <Row className="mb-2">
        <Form.File
          className="mb-2"
          label={filename ? filename : t('settings:database-upload-hint-upload')}
          onChange={onUpload}
          custom
          accept=".json"
        />
        <h6><Trans i18nKey="settings:database-upload-hint-paste" /></h6>
        <textarea className="w-100 text-monospace" value={data} onChange={e => setdata(e.target.value)} style={{ minHeight: "10em" }} />
      </Row>
      {dataValid && <Row>
        <Col xs={12} md={6}><h6><Trans i18nKey="settings:chars-stored" count={numChar}><b>{{ count: numChar }}</b> Characters Stored</Trans></h6></Col>
        <Col xs={12} md={6}><h6><Trans i18nKey="settings:artis-stored" count={numArt}><b>{{ count: numArt }}</b> Artifacts Stored</Trans></h6></Col>
      </Row>}
      {Boolean(data && (error || !dataValid)) && <Alert variant="danger">{error ? error : "Unable to parse character & artifact data from file."}</Alert>}
    </Card.Body>
    <Card.Footer>
      <Button variant={dataValid ? "success" : "danger"} disabled={!dataValid} onClick={replaceDB}><Trans i18nKey="settings:replace-database" /></Button>
    </Card.Footer>
  </Card>
}