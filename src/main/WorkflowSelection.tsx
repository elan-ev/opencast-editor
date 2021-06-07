import React from "react";

import { css } from '@emotion/react'
import { basicButtonStyle, backOrContinueStyle, flexGapReplacementStyle } from '../cssStyles'

import { useDispatch, useSelector } from 'react-redux';
import { selectWorkflows, selectSelectedWorkflowIndex, setSelectedWorkflowIndex } from '../redux/videoSlice'
import { selectFinishState, selectPageNumber } from '../redux/finishSlice'

import { PageButton } from './Finish'
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { SaveAndProcessButton } from "./WorkflowConfiguration";
import { selectStatus, selectError } from "../redux/workflowPostAndProcessSlice";
import { selectStatus as saveSelectStatus, selectError as saveSelectError } from "../redux/workflowPostSlice";
import { httpRequestState, Workflow } from "../types";
import { SaveButton } from "./Save";
import { EmotionJSX } from "@emotion/react/types/jsx-namespace";

import './../i18n/config';
import { useTranslation } from 'react-i18next';
import { Trans } from "react-i18next";
import ErrorBox from "./ErrorBox";

/**
 * Allows the user to select a workflow
 */
const WorkflowSelection : React.FC<{}> = () => {

  const { t } = useTranslation();

  // Initialite redux states
  const workflows = useSelector(selectWorkflows)
  const finishState = useSelector(selectFinishState)
  const pageNumber = useSelector(selectPageNumber)
  const selectedWorkflowIndex = useSelector(selectSelectedWorkflowIndex)

  const postAndProcessWorkflowStatus = useSelector(selectStatus);
  const postAndProcessError = useSelector(selectError)
  const saveStatus = useSelector(saveSelectStatus);
  const saveError = useSelector(saveSelectError)

  // Create workflow selection
  const workflowButtons = () => {
    return (
      workflows.map( (workflow: Workflow, index: number) => (
        <WorkflowButton key={index} stateName={workflow.name} workflowIndex={index}/>
      ))
    );
  }

  // Gets the description from the currently selected workflow
  const workflowDescription = () => {
    if (workflows.length > selectedWorkflowIndex && workflows[selectedWorkflowIndex].description) {
      return (
        workflows[selectedWorkflowIndex].description
      );
    } else {
      return (' ');
    }
  }

  const workflowSelectionStyle = css({
    padding: '20px',
    display: (finishState === "Start processing" && pageNumber === 1) ? 'flex' : 'none',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    ...(flexGapReplacementStyle(50, false)),
  })

  const workflowSelectionSelectionStyle = css({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'left',
    ...(flexGapReplacementStyle(20, false)),
    flexWrap: 'wrap',
    maxHeight: '50vh',
  })

  // Layout template
  const render = (topTitle: string, topText: {} | null | undefined, hasWorkflowButtons: boolean,
    bottomText: {} | null | undefined, nextButton: EmotionJSX.Element, errorStatus: httpRequestState["status"],
    errorMessage: httpRequestState["error"]) => {
    return (
      <div css={workflowSelectionStyle}>
        <h2>{topTitle}</h2>
        {topText}
        { hasWorkflowButtons &&
          <div css={workflowSelectionSelectionStyle} title="Workflow Selection Area">
            {workflowButtons()}
          </div>
        }
        {bottomText}
        <div css={backOrContinueStyle}>
          <PageButton pageNumber={0} label={t("workflowSelection.back-button")} iconName={faChevronLeft}/>
          {/* <PageButton pageNumber={2} label="Continue" iconName={faChevronRight}/> */}
          {nextButton}
        </div>
        <ErrorBox showBox={errorStatus === "failed"} errorMessage={t("workflowSelection.startProcessing-error")} errorDetails={postAndProcessError}/>
      </div>
    );
  }

  // Fills the layout template with values based on how many workflows are available
  const renderSelection = () => {
    if (workflows.length <= 0) {
      return(
        render(
          t("workflowSelection.saveAndProcess-text"),
          <Trans i18nKey="workflowSelection.noWorkflow-text">
            A problem occurred, there are no workflows to process your changes with.<br />
            Please save your changes and contact an Opencast Administrator.
          </Trans>,
          false,
          "",
          <SaveButton />,
          saveStatus,
          saveError
        )
      );
    } else if (workflows.length === 1) {
      return (
        render(
          t("workflowSelection.saveAndProcess-text"),
          <Trans i18nKey="workflowSelection.oneWorkflow-text">
            The video will be cut and processed with the workflow "{{workflow: workflows[0].name}}".<br/>
            This will take some time.
          </Trans>,
          false,
          "",
          <SaveAndProcessButton text={t("workflowSelection.startProcessing-button")}/>,
          postAndProcessWorkflowStatus,
          postAndProcessError
        )
      );
    } else {
      return (
        render(
          t("workflowSelection.selectWF-text"),
          <div>
            {t("workflowSelection.manyWorkflows-text")}
          </div>,
          true,
          <div><i>{workflowDescription()}</i></div>,
          <SaveAndProcessButton text= {t("workflowSelection.startProcessing-button")}/>,
          postAndProcessWorkflowStatus,
          postAndProcessError
        )
      )
    }
  }

  return (
    renderSelection()
  );
}

/**
 * Clicking this button sets the associated workflow as selected
 * @param param0
 */
const WorkflowButton: React.FC<{stateName: string, workflowIndex: number}> = ({stateName, workflowIndex}) => {

  const { t } = useTranslation();

  const dispatch = useDispatch();
  const selectedWorkflowIndex = useSelector(selectSelectedWorkflowIndex)

  const selectWorkflowIndex = () => {
    dispatch(setSelectedWorkflowIndex(workflowIndex))
  }

  const workflowButtonStyle = css({
    backgroundColor: workflowIndex !== selectedWorkflowIndex ? 'snow' : '#DDD',
    padding: '16px',
  });

  return (
    <div css={[basicButtonStyle,workflowButtonStyle]} title={t("workflowSelection.selectWF-button")}
      role="button" tabIndex={0}
      aria-label={t("workflowSelection.selectWF-button", {stateName})}
      onClick={ selectWorkflowIndex }
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key === " " || event.key === "Enter") {
        selectWorkflowIndex()
      }}}>
      <span>{stateName}</span>
    </div>
  );
}

export default WorkflowSelection;
