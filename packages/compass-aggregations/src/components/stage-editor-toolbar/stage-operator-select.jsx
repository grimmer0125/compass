import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select-plus';

import SelectOptionWithTooltip from './select-option-with-tooltip/select-option-with-tooltip';
import { filterStageOperators } from '../../utils/stage';

import styles from './stage-operator-select.module.less';

/**
 * Select from a list of stage operators.
 */

class StageOperatorSelect extends PureComponent {
  static displayName = 'StageOperatorSelectComponent';

  static propTypes = {
    allowWrites: PropTypes.bool.isRequired,
    env: PropTypes.string.isRequired,
    stageOperator: PropTypes.string,
    index: PropTypes.number.isRequired,
    isEnabled: PropTypes.bool.isRequired,
    isCommenting: PropTypes.bool.isRequired,
    stageOperatorSelected: PropTypes.func.isRequired,
    serverVersion: PropTypes.string.isRequired,
    setIsModified: PropTypes.func.isRequired
  }

  /**
   * Called when the stage operator is selected.
   * @param {String} name The name of the stage operator.
   * @returns {void}
   */
  onStageOperatorSelected = (name) => {
    this.props.stageOperatorSelected(
      this.props.index,
      name,
      this.props.isCommenting,
      this.props.env
    );
    this.props.setIsModified(true);
  }

  /**
   * Render the stage operator select component.
   *
   * @returns {Component} The component.
   */
  render() {
    const operators = filterStageOperators(
      this.props.serverVersion,
      this.props.allowWrites,
      this.props.env
    );
    return (
      <div className={styles['stage-operator-select']}>
        <Select
          optionComponent={SelectOptionWithTooltip}
          simpleValue
          searchable
          openOnClick
          openOnFocus
          clearable={false}
          disabled={!this.props.isEnabled}
          className={styles['stage-operator-select-control']}
          options={operators}
          value={this.props.stageOperator}
          onChange={this.onStageOperatorSelected}
        />
      </div>
    );
  }
}

export default StageOperatorSelect;
