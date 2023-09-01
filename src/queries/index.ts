export const requestFileUploadQuery = `#graphql
    mutation FileUploadRequestMutation {
        fileUploadRequest {
        # the id will be used for creating the library track from the file upload
        id
        # the uploadUrl specifies where we need to upload the file to
        uploadUrl
        }
  }`;
export const createLibraryTrackQuery = `#graphql
    mutation LibraryTrackCreateMutation($input: LibraryTrackCreateInput!) {
    libraryTrackCreate(input: $input) {
        __typename
        ... on LibraryTrackCreateSuccess {
        createdLibraryTrack {
            id
        }
        }
        ... on LibraryTrackCreateError {
        code
        message
        }
    }
    }
`;
