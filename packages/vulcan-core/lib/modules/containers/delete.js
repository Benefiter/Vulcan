/*

Generic mutation wrapper to remove a document from a collection. 

Sample mutation: 

  mutation deleteMovie($input: DeleteMovieInput) {
    deleteMovie(input: $input) {
      data {
        _id
        name
        __typename
      }
      __typename
    }
  }

Arguments: 

  - input
    - input.selector: the id of the document to remove

Child Props:

  - deleteMovie({ selector })
  
*/

import React from 'react';
import gql from 'graphql-tag';
import { useMutation } from '@apollo/react-hooks';
import { deleteClientTemplate } from 'meteor/vulcan:core';
import { extractCollectionInfo, extractFragmentInfo } from 'meteor/vulcan:lib';

export const buildDeleteQuery = ({ typeName, fragmentName, fragment }) => (
  gql`
    ${deleteClientTemplate({ typeName, fragmentName })}
    ${fragment}
  `
);
export const useDelete = (options) => {
  const { collectionName, collection } = extractCollectionInfo(options);
  const { fragmentName, fragment } = extractFragmentInfo(options, collectionName);
  const typeName = collection.options.typeName;

  const query = buildDeleteQuery({
    fragment,
    fragmentName, typeName
  });

  const [deleteFunc] = useMutation(query);
  const extendedDeleteFunc = ({ selector }) => deleteFunc({ variables: { selector } });
  return [extendedDeleteFunc];
};

export const withDelete = options => C => {
  const { collection } = extractCollectionInfo(options);
  const typeName = collection.options.typeName;
  const funcName = `delete${typeName}`;
  const legacyError = () => {
    throw new Error(`removeMutation function has been removed. Use ${funcName} function instead.`);
  };

  const Wrapper = (props) => {
    const [deleteFunc] = useDelete(options);
    return (
      <C {...props} {...{ [funcName]: deleteFunc }} removeMutation={legacyError} />
    );
  };
  Wrapper.displayName = `withDelete${typeName}`;
  return Wrapper;
};

export default withDelete;
