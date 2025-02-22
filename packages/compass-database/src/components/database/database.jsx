import React, { Component } from 'react';
import classnames from 'classnames';
import { TabNavBar, UnsafeComponent } from 'hadron-react-components';

import styles from './database.module.less';

class Database extends Component {
  static displayName = 'DatabaseComponent';

  constructor(props) {
    super(props);
    this.state = { activeTab: 0 };
    this.setupTabs();
  }

  /**
   * Handle the tab click.
   *
   * @param {Number} idx - The index of the clicked tab.
   */
  onTabClicked = (idx) => {
    if (this.state.activeTab === idx) {
      return;
    }
    this.setState({ activeTab: idx });
  }

  /**
   * Setup the instance level tabs.
   */
  setupTabs() {
    const roles = global.hadronApp.appRegistry.getRole('Database.Tab');

    const tabs = [];
    const views = roles.map((role, i) => {
      tabs.push(role.name);
      return (
        <UnsafeComponent component={role.component} key={i} />
      );
    });

    this.tabs = tabs;
    this.views = views;
  }

  /**
   * Render Database component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    return (
      <div className={classnames(styles.database)}>
        <TabNavBar
          aria-label="Database Tabs"
          tabs={this.tabs}
          views={this.views}
          mountAllViews={false}
          activeTabIndex={this.state.activeTab}
          onTabClicked={this.onTabClicked} />
      </div>
    );
  }
}

export default Database;
