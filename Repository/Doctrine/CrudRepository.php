<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\ORM\EntityRepository;
use Hexmedia\AdministratorBundle\Repository\CrudRepositoryInterface;

abstract class CrudRepository extends EntityRepository implements CrudRepositoryInterface {
    use ListTrait;

    public function getAll()
    {
        return $this->findAll();
    }

    public function getBy($where = [], $order = null, $limit = null, $offset = 0)
    {
        return $this->findBy($where, $order, $limit, $offset);
    }

    public function get($id)
    {
        return $this->find($id);
    }

    public function getOneBy($criteria = [], $orderBy = null)
    {
        return $this->findOneBy($criteria, $orderBy);
    }
}