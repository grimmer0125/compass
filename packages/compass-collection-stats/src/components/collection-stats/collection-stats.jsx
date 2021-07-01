import React, { Component } from 'react';
import PropTypes from 'prop-types';

import DocumentStatsItem from '../document-stats-item';
import IndexStatsItem from '../index-stats-item';

import styles from './collection-stats.less';

class CollectionStats extends Component {
  static displayName = 'CollectionStatsComponent';

  static propTypes = {
    documentCount: PropTypes.string.isRequired,
    totalDocumentSize: PropTypes.string.isRequired,
    avgDocumentSize: PropTypes.string.isRequired,
    indexCount: PropTypes.string.isRequired,
    totalIndexSize: PropTypes.string.isRequired,
    avgIndexSize: PropTypes.string.isRequired,
    isReadonly: PropTypes.bool.isRequired,
    isTimeSeries: PropTypes.bool.isRequired
  };

  /**
   * Render CollectionStats component.
   *
   * @returns {React.Component} The rendered component.
   */
  render() {
    if (this.props.isReadonly === true) {
      return <div className={styles['collection-stats-empty']} />;
    }

    return (
      <div className={styles['collection-stats']}>
        <DocumentStatsItem
          isTimeSeries={this.props.isTimeSeries}
          documentCount={this.props.documentCount}
          totalDocumentSize={this.props.totalDocumentSize}
          avgDocumentSize={this.props.avgDocumentSize}
        />
        {!this.props.isTimeSeries && (
          <IndexStatsItem
            indexCount={this.props.indexCount}
            totalIndexSize={this.props.totalIndexSize}
            avgIndexSize={this.props.avgIndexSize}
          />
        )}
      </div>
    );
  }
}

export default CollectionStats;
export { CollectionStats };
