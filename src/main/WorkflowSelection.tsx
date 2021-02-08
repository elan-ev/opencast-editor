import React from "react";

import { css } from '@emotion/react'
import { basicButtonStyle, backOrContinueStyle, errorBoxStyle } from '../cssStyles'

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

/**
 * Allows the user to select a workflow
 */
const WorkflowSelection : React.FC<{}> = () => {

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
    gap: '50px',
  })

  const workflowSelectionSelectionStyle = css({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'left',
    gap: '20px',
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
          <PageButton pageNumber={0} label="Take me back" iconName={faChevronLeft}/>
          {/* <PageButton pageNumber={2} label="Continue" iconName={faChevronRight}/> */}
          {nextButton}
        </div>
        <div css={errorBoxStyle(errorStatus === "failed")} title="Error Box" role="alert">
          <span>An error has occured. Please wait a bit and try again.</span><br />
          {errorMessage ? "Details: " + errorMessage : "No error details are available."}<br />
        </div>
      </div>
    );
  }

  // Fills the layout template with values based on how many workflows are available
  const renderSelection = () => {
    if (workflows.length <= 0) {
      return(
        render(
          'Save and Process',
          <div>
            A problem occured, there are no workflows to process your changes with.<br />
            Please save your changes and contact an Opencast Administrator.
          </div>,
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
          'Save and Process',
          <div>
            The video will be cut and processed with the workflow "{workflows[0].name}".<br />
            This will take some time.
          </div>,
          false,
          "",
          <SaveAndProcessButton text="Start processing/>,
          postAndProcessWorkflowStatus,
          postAndProcessError
        )
      );
    } else {
      return (
        render(
          'Select a workflow',
          <div>
            Select which workflow Opencast should use for processing.
          </div>,
          true,
          <div><i>{workflowDescription()}</i></div>,
          <SaveAndProcessButton text="Start processing/>,
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
    <div css={[basicButtonStyle,workflowButtonStyle]} title={"Click to select this workflow"}
      role="button" tabIndex={0}
      aria-label={"Press to select the workflow: " + stateName}
      onClick={ selectWorkflowIndex }
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key === " " || event.key === "Enter") {
        selectWorkflowIndex()
      }}}>
      <span>{stateName}</span>
    </div>
  );
}

export default WorkflowSelection;
