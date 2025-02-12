import { registerComponent, Components, formatLabel } from 'meteor/vulcan:lib';
import { intlShape, FormattedMessage } from 'meteor/vulcan:i18n';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import { Link } from 'react-router-dom';
import without from 'lodash/without';

const getLabel = (field, fieldName, collection, intl) => {
  const schema = collection && collection.simpleSchema()._schema;
  return formatLabel({
    intl,
    fieldName: fieldName,
    collectionName: collection && collection._name,
    schema: schema,
  });
};

const getTypeName = (field, fieldName, collection) => {
  const schema = collection && collection.simpleSchema()._schema;
  const fieldSchema = schema && schema[fieldName];
  if (fieldSchema) {
    const type = fieldSchema.type.singleType;
    const typeName = typeof type === 'function' ? type.name : type;
    return typeName;
  } else {
    return typeof field;
  }
};

const parseImageUrl = (value, forceIsImage = false) => {
  const isImage =
    ['.png', '.jpg', '.gif'].indexOf(value.substr(-4)) !== -1 ||
    ['.webp', '.jpeg'].indexOf(value.substr(-5)) !== -1;
  return isImage || forceIsImage ? (
    <img
      style={{ width: '100%', minWidth: 80, maxWidth: 200, display: 'block' }}
      src={value}
      alt={value}
    />
  ) : (
    parseUrl(value)
  );
};

const parseUrl = value => {
  return value.slice(0, 4) === 'http' ? (
    <a href={value} target="_blank" rel="noopener noreferrer">
      <LimitedString string={value} />
    </a>
  ) : (
    <LimitedString string={value} />
  );
};

const LimitedString = ({ string }) => (
  <div>
    {string.indexOf(' ') === -1 && string.length > 30 ? (
      <span title={string}>{string.substr(0, 30)}…</span>
    ) : (
      <span>{string}</span>
    )}
  </div>
);

const formatDate = value => moment(new Date(value)).format('YYYY/MM/DD, hh:mm');

export const getFieldValue = (value, options = {}) => {
  // if typeName is not provided, default to typeof value
  // note: contents provides additional clues about the contents (image, video, etc.)

  let { typeName = typeof value, contents } = options;

  // no value; we return an empty string
  if (typeof value === 'undefined' || value === null) {
    return '';
  }

  // JSX element
  if (React.isValidElement(value)) {
    return value;
  }

  // Array
  if (Array.isArray(value)) {
    typeName = 'Array';
  }

  switch (typeName) {
    case 'Boolean':
    case 'boolean':
    case 'Number':
    case 'number':
    case 'SimpleSchema.Integer':
      return <code>{value.toString()}</code>;

    case 'Array':
      return (
        <ol>
          {value.map((item, index) => (
            <li key={index}>{getFieldValue(item, { typeName: typeof item })}</li>
          ))}
        </ol>
      );

    case 'Object':
    case 'object':
      return getObject(value);

    case 'Date':
      return formatDate(value);

    case 'String':
    case 'string':
      switch (contents) {
        case 'html':
          return <div dangerouslySetInnerHTML={{ __html: value }} />;

        case 'date':
          return formatDate(value);

        case 'image':
          return parseImageUrl(value, true);

        case 'url':
          return parseUrl(value, true);

        default:
          // still attempt to parse string as an image or URL if possible
          return parseImageUrl(value);
      }

    default:
      return value.toString();
  }
};

const getObject = object => {
  if (object.__typename === 'User') {
    const user = object;

    return (
      <div className="dashboard-user" style={{ whiteSpace: 'nowrap' }}>
        <Components.Avatar size="small" user={user} link />
        <Link to={user.pagePath}>{user.displayName}</Link>
      </div>
    );
  } else {
    return (
      <table className="table table-bordered">
        <tbody>
          {without(Object.keys(object), '__typename').map(key => (
            <tr key={key}>
              <td>
                <strong>{key}</strong>
              </td>
              <td>{getFieldValue(object[key], { typeName: typeof object[key] })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
};

const CardItem = ({ label, value, typeName }) => (
  <tr>
    <td className="datacard-label">
      <strong>{label}</strong>
    </td>
    <td className="datacard-value">{getFieldValue(value, { typeName })}</td>
  </tr>
);

const CardEdit = (props, context) => (
  <tr>
    <td colSpan="2">
      <Components.ModalTrigger
        label={context.intl.formatMessage({ id: 'cards.edit' })}
        component={
          <Components.Button variant="info">
            <FormattedMessage id="cards.edit" />
          </Components.Button>
        }>
        <CardEditForm {...props} />
      </Components.ModalTrigger>
    </td>
  </tr>
);

CardEdit.contextTypes = { intl: intlShape };

const CardEditForm = ({ collection, document, closeModal, ...editFormProps }) => (
  <Components.SmartForm
    collection={collection}
    documentId={document._id}
    showRemove={true}
    successCallback={document => {
      closeModal();
    }}
    {...editFormProps}
  />
);

const Card = (
  { title, className, collection, document, currentUser, fields, showEdit = true, ...editFormProps },
  { intl }
) => {
  const fieldNames = fields ? fields : without(Object.keys(document), '__typename');
  const canEdit =
    showEdit &&
    currentUser &&
    collection &&
    collection.options.mutations.update.check(currentUser, document);

  return (
    <div
      className={classNames(className, 'datacard', collection && `datacard-${collection._name}`)}>
      {title && <div className="datacard-title">{title}</div>}
      <table className="table table-bordered" style={{ maxWidth: '100%' }}>
        <tbody>
          {canEdit ? (
            <CardEdit collection={collection} document={document} {...editFormProps} />
          ) : null}
          {fieldNames.map((fieldName, index) => (
            <CardItem
              key={index}
              value={document[fieldName]}
              typeName={getTypeName(document[fieldName], fieldName, collection)}
              label={getLabel(document[fieldName], fieldName, collection, intl)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

Card.displayName = 'Card';

Card.propTypes = {
  className: PropTypes.string,
  collection: PropTypes.object,
  document: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  currentUser: PropTypes.object,
  fields: PropTypes.array,
  showEdit: PropTypes.bool,
  editFormProps: PropTypes.object,
};

Card.contextTypes = {
  intl: intlShape,
};

registerComponent('Card', Card);
