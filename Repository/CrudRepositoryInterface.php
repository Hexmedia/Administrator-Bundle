<?php

namespace Hexmedia\AdministratorBundle\Repository;

interface CrudRepositoryInterface extends ListRepositoryInterface {
    function getAll();
    function getBy($where = [], $order = null, $limit = null, $offset = 0);
    function get($id);
    function getOneBy($criteria = [], $orderBy = null);
}