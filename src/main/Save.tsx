import React, { useEffect } from "react";

import { css } from '@emotion/react'
import { basicButtonStyle, backOrContinueStyle, ariaLive,
  nagivationButtonStyle, flexGapReplacementStyle } from '../cssStyles'

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner, faCheck, faExclamationCircle, faChevronLeft, faSave,
} from "@fortawesome/free-solid-svg-icons";

import { useDispatch, useSelector } from 'react-redux';
import { selectFinishState } from '../redux/finishSlice'
import { selectSegments, selectTracks, setHasChanges as videoSetHasChanges } from '../redux/videoSlice'
import { postVideoInformation, selectStatus, selectError } from '../redux/workflowPostSlice'

import { PageButton } from './Finish'

import './../i18n/config';
import { useTranslation } from 'react-i18next';
import ErrorBox from "./ErrorBox";
import { postMetadata, selectPostError, selectPostStatus, setHasChanges as metadataSetHasChanges } from "../redux/metadataSlice";

/**
 * Shown if the user wishes to save.
 * Informs the user about saving and displays a save button
 */
const Save : React.FC<{}> = () => {

  const { t } = useTranslation();

  const finishState = useSelector(selectFinishState)

  const postWorkflowStatus = useSelector(selectStatus);
  const postError = useSelector(selectError)
  const postMetadataStatus = useSelector(selectPostStatus);
  const postMetadataError = useSelector(selectPostError);

  const saveStyle = css({
    height: '100%',
    display: finishState !== "Save changes" ? 'none' : 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    ...(flexGapReplacementStyle(30, false)),
  })

  return (
    <div css={saveStyle} title={t("save.saveArea-tooltip")}>
      <h1>{t("save.headline-text")}</h1>
      <span css={{maxWidth: '500px'}}>
        {t("save.info-text")}
      </span>
      <div css={backOrContinueStyle}>
        <PageButton pageNumber={0} label={t("various.goBack-button")} iconName={faChevronLeft}/>
        <SaveButton />
      </div>
      <ErrorBox showBox={postWorkflowStatus === "failed"} errorMessage={t("save.save-error")} errorDetails={postError} />
      <ErrorBox showBox={postMetadataStatus === "failed"} errorMessage={t("metadata.save-error")} errorDetails={postMetadataError} />
    </div>
  );
}

/**
 * Button that sends a post request to save current changes
 */
export const SaveButton: React.FC<{}> = () => {

  const { t } = useTranslation();

  // Initialize redux variables
  const dispatch = useDispatch()

  const segments = useSelector(selectSegments)
  const tracks = useSelector(selectTracks)
  const workflowStatus = useSelector(selectStatus);
  const metadataStatus = useSelector(selectPostStatus);

  // Update based on current fetching status
  let icon = faSave
  let spin = false
  let tooltip = t("save.confirmButton-default-tooltip")
  if (workflowStatus === 'failed' || metadataStatus === 'failed'){
    icon = faExclamationCircle
    spin = false
    tooltip = t("save.confirmButton-failed-tooltip")
  } else if (workflowStatus === 'success' && metadataStatus === 'success') {
    icon = faCheck
    spin = false
    tooltip = t("save.confirmButton-success-tooltip")
  } else if (workflowStatus === 'loading' || metadataStatus === 'loading')  {
    icon = faSpinner
    spin = true
    tooltip = t("save.confirmButton-attempting-tooltip")
  }

  const ariaSaveUpdate = () => {
    if(workflowStatus === 'success') {
      return t("save.success-tooltip-aria")
    }
  }

  const save = () => {
    dispatch(postMetadata())
    dispatch(postVideoInformation({
      segments: segments,
      tracks: tracks,
    }))
  }

  // Let users leave the page without warning after a successful save
  useEffect(() => {
    if (workflowStatus === 'success' && metadataStatus === 'success') {
      dispatch(videoSetHasChanges(false))
      dispatch(metadataSetHasChanges(false))
    }
  }, [dispatch, metadataStatus, workflowStatus])

  return (
    <div css={[basicButtonStyle, nagivationButtonStyle]} title={tooltip}
      role="button" tabIndex={0}
      onClick={ save }
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key === " " || event.key === "Enter") {
        save()
      }}}>
      <FontAwesomeIcon icon={icon} spin={spin} size="1x"/>
      <span>{t("save.confirm-button")}</span>
      <div css={ariaLive} aria-live="polite" aria-atomic="true">{ariaSaveUpdate()}</div>
    </div>
  );
}


export default Save;
