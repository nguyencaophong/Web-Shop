               // Exec form Delete 
               const btndeletemovieId = document.getElementById('deleteItems')
               const deleteForm = document.forms['delete-form-items']
               let itemId;
               document.addEventListener('DOMContentLoaded' , () =>{
                   $('#delete-items').on('show.bs.modal', function (event) {
                       const button = $(event.relatedTarget) 
                       itemId = button.data('id') ;   
                   })
               })

               btndeletemovieId.onclick = () =>{
                   deleteForm.action = `/admin/delete-product/${itemId}?_method=DELETE`;

                   const hidden_Prod = document.getElementById('hidden-itemId');

                   hidden_Prod.value = itemId;
                   deleteForm.submit();
               }